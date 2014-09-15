import csv
import socket
import struct
import sys
import os

from splunk.clilib import cli_common as cli


GEO_FIELD = '_geo'
GEO_INFO_FIELD = 'geo_info'
DEFAULT_FIELDS = ['country_code', 'country_name', 'city', 'region_name', 'latitude', 'longitude', 'postal_code']
INFO_FIELDS = ['city', 'country_name']


class GeoipError(Exception): pass


geoipconf = {}


def getSelfConfStanza(stanza):
    global geoipconf
    if len(geoipconf) == 0:
        # this should point to maps
        appdir = os.path.dirname(os.path.dirname(__file__))
        geoipconfpath = os.path.join(appdir, "default", "geoip.conf")
        geoipconf = cli.readConfFile(geoipconfpath)
        localconfpath = os.path.join(appdir, "local", "geoip.conf")
        if os.path.exists(localconfpath):
            localconf = cli.readConfFile(localconfpath)
            for name, content in localconf.items():
                if name in geoipconf:
                    geoipconf[name].update(content)
                else:
                    geoipconf[name] = content
        print >> sys.stderr, "DEBUG Read geoip.conf: %s" % str(geoipconf)
    return geoipconf[stanza]


class PyGeoIPLookup:
    def __init__(self, resolve_hostnames=None):
        from pygeoip import GeoIP, STANDARD, MMAP_CACHE, MEMORY_CACHE

        cfg = getSelfConfStanza("settings")
        cache = STANDARD
        cfg2 = getSelfConfStanza("pygeoip")
        if _bool(cfg2["cache_mmap"]):
            try:
                import mmap
            except:
                raise GeoipError("MMAP caching is enabled, but the python module is not available!")
            cache = MMAP_CACHE
        elif _bool(cfg['cache_memory']):
            cache = MEMORY_CACHE
        self.db = GeoIP(cfg['database_file'], cache)
        if resolve_hostnames is None: resolve_hostnames = _bool(cfg['resolve_hostnames'])
        self.resolve_hostnames = resolve_hostnames

    def resolve(self, ip):
        ip = ip2int(ip, self.resolve_hostnames)
        if ip is not None: return self.db._get_record(ip)


class GeoIPLookup:
    def __init__(self, resolve_hostnames=None):
        import GeoIP

        cfg = getSelfConfStanza("settings")
        # cfg = cli.getConfStanza("geoip","settings")
        cache = GeoIP.GEOIP_STANDARD
        if _bool(cfg['cache_memory']): cache = GeoIP.GEOIP_MEMORY_CACHE
        db = GeoIP.open(cfg['database_file'], cache)
        if resolve_hostnames is None: resolve_hostnames = _bool(cfg['resolve_hostnames'])
        if resolve_hostnames:
            self.resolver = db.record_by_name
        else:
            self.resolver = db.record_by_addr

    def resolve(self, ip):
        return self.resolver(ip)


def is_c_api_available():
    try:
        import GeoIP

        return True
    except:
        return False


def _bool(val, defaultValue=False):
    """
        normalize a boolean configuration value
    """
    if val is None: return defaultValue
    val = str(val).lower()
    if val in ['1', 'true']:
        return True
    elif val in ['0', 'false']:
        return False
    else:
        return defaultValue


def ip2int(ip, resolve_hostnames=False):
    """
        faster implementation of IP str to int conversion
    """
    try:
        return struct.unpack('!L', socket.inet_aton(ip))[0]
    except:
        if resolve_hostnames:
            try:
                ip = socket.gethostbyname(ip)
                return struct.unpack('!L', socket.inet_aton(ip))[0]
            except:
                pass


def process_fields(fields, prefix=None):
    res = []
    for field in fields:
        if type(field) == str:
            field = (field, field)
        elif len(field) == 1:
            field = (field[0], field[0])
        if prefix: field = (field[0], "".join([prefix, field[1]]))
        res.append(field)
    return res


def get_geo_db_info(cfg=None):
    if not cfg:
        # cfg = cli.getConfStanza("geoip","settings")
        cfg = getSelfConfStanza("settings")
    import re, os

    path = os.path.expandvars(cfg['database_file'])
    if not os.path.exists(path):
        raise GeoipError("GeoIP database file '%s' does not exist!" % path)
    size = os.path.getsize(path)
    file = open(path, "rb")
    file.seek(size - 256)
    m = re.search("\x00\x00\x00([^\x00]+)\xFF\xFF\xFF", file.read(256))
    if m: return m.group(1)


def process_csv_stream(input, output, prefix=None, ip_field="ip", fields=DEFAULT_FIELDS, add_missing_fields=True,
                       add_geo_field=True, add_info_field=None, ip_field_mandatory=True, preprocess_row=None,
                       resolve_hostnames=None):
    """
        Enriches the given CSV input stream with geoip information and sends it as CSV to the output
    """
    # cfg = cli.getConfStanza("geoip","settings")
    cfg = getSelfConfStanza("settings")

    api = cfg['api']

    if api == 'pygeoip':
        db = PyGeoIPLookup(resolve_hostnames=resolve_hostnames)
    elif api == 'geoip':
        db = GeoIPLookup(resolve_hostnames=resolve_hostnames)
    else:
        raise GeoipError("Invalid API '%s' configured! Valid options: geoip, pygeoip" % api)

    reader = csv.DictReader(input)
    headers = reader.fieldnames
    if not headers: return

    if ip_field_mandatory and not ip_field in headers:
        raise GeoipError("The IP field '%s' has to exist in the given data." % ip_field)

    if not ip_field in headers and preprocess_row:
        headers.append(ip_field)

    fields = process_fields(fields, prefix)
    for field in fields:
        if not field[1] in headers:
            if add_missing_fields:
                headers.append(field[1])
            else:
                fields.remove(field)

    if add_geo_field and not GEO_FIELD in headers:
        headers.append(GEO_FIELD)

    if add_info_field is None:
        add_info_field = _bool(cfg['add_info_field'])
    if add_info_field and not GEO_INFO_FIELD in headers:
        headers.append(GEO_INFO_FIELD)

    writer = csv.DictWriter(output, headers)
    writer.writer.writerow(headers)

    for row in reader:
        if preprocess_row: row = preprocess_row(row)
        ip = row[ip_field]
        if not ip is None:
            record = db.resolve(ip)
            if record:
                # Umlauts in city names in GeoCity database are ISO-8859-1 encoded
                if 'city' in record and record['city'] is not None: record['city'] = unicode(record['city'],
                                                                                             "ISO-8859-1")
                for field in fields:
                    if field[0] in record:
                        val = record[field[0]]
                        row[field[1]] = val
                if add_geo_field:
                    row[GEO_FIELD] = "%s,%s" % (record['latitude'], record['longitude'])
                if add_info_field:
                    row[GEO_INFO_FIELD] = ", ".join(
                        [record[y] for y in INFO_FIELDS if y in record and record[y] is not None])
        writer.writerow(row)


if __name__ == '__main__':
    process_csv_stream(sys.stdin, sys.stdout, prefix="ip_")
