import sys,os,time

class OutputStreamRedirect:
	def __init__(self, *streams):
		self.streams = streams

	def write(self, str):
		for s in self.streams:
			s.write(str)

	def destroy(self):
		for s in self.streams:
			s.close()

def redirect_output(dirname, unique_dir = None):
	import os
	log_dir = os.path.expandvars(os.path.join("$SPLUNK_HOME","var","log",dirname))
	if not unique_dir: unique_dir = str(time.time())
	p = os.path.join(log_dir, unique_dir)
	if not os.path.exists(p): os.makedirs(p)
	sys.stdout = OutputStreamRedirect(sys.__stdout__, open(os.path.join(p,"stdout.log"),"w",0))
	sys.stderr = OutputStreamRedirect(sys.__stderr__, open(os.path.join(p,"stderr.log"),"w",0))

	
def redirect_input(dirname, unique_dir = None):
	import os,time
	log_dir = os.path.expandvars(os.path.join("$SPLUNK_HOME","var","log",dirname))
	if not unique_dir: unique_dir = str(time.time())
	p = os.path.join(log_dir, unique_dir)
	if not os.path.exists(p): os.makedirs(p)
	stdin_file = open(os.path.join(p, "stdin.log"),"w",0)
	stdin_file.write(sys.__stdin__.read())
	stdin_file.close()
	sys.stdin = open(os.path.join(p, "stdin.log"), "r")

def redirect_all(dirname):
	unique_dir = str(time.time())
	redirect_input(dirname, unique_dir)
	redirect_output(dirname, unique_dir)