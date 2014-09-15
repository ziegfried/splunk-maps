import splunk.entity
import splunk.bundle
import splunk.admin
import spp

class ConfigEndpoint(splunk.admin.MConfigHandler):
	"""Custom abstract subclass of MConfigHandler which implements a few utility methods"""
	def deleteConfStanza(self, conf, stanza):
		cfg = self.readConfCtx(conf)
		if stanza in cfg:
			cfg = cfg[stanza]
			sessionKey = self.getSessionKey()
			entity = splunk.entity.getEntity("/admin/conf-%s" % conf, stanza, sessionKey=sessionKey, owner='nobody', namespace=cfg['eai:appName'])
			splunk.entity.deleteEntity('/admin/conf-%s' % conf, stanza, entity['eai:acl']['app'], owner='nobody', sessionKey=sessionKey)


class ConfigOption:
	def __init__(self, name, readonly = False, writeonly = False, mandatory = False):
		self.name = name
		self.readonly = readonly
		self.writeonly = writeonly
		self.mandatory = mandatory

class SetupEndpoint(ConfigEndpoint):
	READONLY = 1
	WRITEONLY = 2
	MANDATORY = 4

	SUPPORTED_OPTIONS = None

	CONFIG = None

	def __init__(self, *args,**kvargs):
		splunk.admin.MConfigHandler.__init__(self, *args, **kvargs)
		self._setup_supported_options()

	def _setup_supported_options(self):
		options = self.SUPPORTED_OPTIONS
		opt = {}
		for stanza, items in options.items():
			l = list()
			for item in items:
				if type(item) is str:
					l.append(ConfigOption(item))
				elif type(item) is tuple or type(item) is list:
					name = item[0]
					if len(item) > 1:
						flags = item[1]
						flag_dict = {}
						if flags & self.READONLY: flag_dict['readonly'] = True
						if flags == self.WRITEONLY: flag_dict['writeonly'] = True
						if flags == self.MANDATORY: flag_dict['mandatory'] = True
						l.append(ConfigOption(name, **flag_dict))
					else:
						l.append(ConfigOption(name))
				else:
					pass
			opt[stanza] = l
		self._supported_options = opt

	def setup(self):
		if self.callerArgs.id:
			for opt in self._supported_options[self.callerArgs.id]:
				if opt.mandatory:
					self.supportedArgs.addReqArg(opt.name)
				else:
					self.supportedArgs.addOptArg(opt.name)
		else:
			for x,opts in self._supported_options.items():
				for opt in opts:
					if opt.mandatory:
						self.supportedArgs.addReqArg(opt.name)
					else:
						self.supportedArgs.addOptArg(opt.name)

	def handleList(self, output):
		config = self.readConfCtx(self.CONFIG)
		for stanza,opts in self._supported_options.items():
			cfg = config[stanza]
			for opt in opts:
				if not opt.writeonly:
					output[stanza].append(opt.name, cfg.get(opt.name))
		self.process_list(output)

	def process_list(self, output):
		pass

	def _get_arg(self, name, defVal = None):
		return self.callerArgs.get(name, [ defVal ])[0]

	def handleEdit(self, output):
		props = {}
		for arg in self._supported_options[self.callerArgs.id]:
			if not arg.readonly:
				props[arg.name] = self.callerArgs.get(arg.name, [ None ])[0]
		self.process_edit(output, props)
		self.writeConf(self.CONFIG, self.callerArgs.id, props)

	def process_edit(self, output, props):
		return props