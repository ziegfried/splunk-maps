import splunk.appserver.mrsparkle.controllers as controllers
from splunk.appserver.mrsparkle.lib.decorators import expose_page
import splunk.entity
import cherrypy
import json

CONFIG_ENTITY_PATH = 'configs/conf-mapsapp'


class MapsConfigController(controllers.BaseController):
    @expose_page(must_login=True)
    def config(self, **kwargs):
        sessionKey = cherrypy.session.get('sessionKey')
        result = dict()
        cfg = splunk.entity.getEntity(CONFIG_ENTITY_PATH, 'mapsview-defaults',
                                      namespace='maps', sessionKey=sessionKey)

        mapsViewSettings = dict()
        for k, v in cfg.items():
            if not k.startswith('eai:') and k not in ('disabled',):
                try:
                    mapsViewSettings[k] = json.loads(v)
                except:
                    mapsViewSettings[k] = v
        result['mapsview'] = mapsViewSettings

        tileLayers = []
        for tl in splunk.entity.getEntitiesList(CONFIG_ENTITY_PATH,
                                                namespace='maps', search='name=tiles:* AND disabled=0'):
            layerSettings = dict()
            for k in ('name', 'url', 'attribution', 'type'):
                if k in tl:
                    layerSettings[k] = tl[k]
            for k in ('minZoom', 'maxZoom'):
                if k in tl:
                    layerSettings[k] = int(tl[k])
            tileLayers.append(layerSettings)

        result['tileLayers'] = tileLayers
        return json.dumps(result)