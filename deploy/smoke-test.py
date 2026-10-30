#!/usr/bin/env python3
"""HTTP integration checks. Run only against a disposable instance: creates test data."""
import argparse, json, urllib.request, urllib.error, base64, uuid
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--env-file', required=True, help='Protected test credentials file')
parser.add_argument('--url', required=True, help='URL of a disposable test instance')
args = parser.parse_args()
from pathlib import Path
env=dict(line.split('=',1) for line in Path(args.env_file).read_text().splitlines() if '=' in line and not line.lstrip().startswith('#'))
base=args.url.rstrip('/')
token=None
def call(method,path,body=None,content_type='application/json',raw=False):
    headers={'Content-Type':content_type}
    if token: headers['Authorization']='Bearer '+token
    if body is not None and not isinstance(body,bytes): body=json.dumps(body).encode()
    req=urllib.request.Request(base+path,data=body,headers=headers,method=method)
    try:
        with urllib.request.urlopen(req,timeout=30) as response:
            data=response.read()
            return data if raw else (json.loads(data) if data else None)
    except urllib.error.HTTPError as e:
        print('FAILED',method,path,e.code,e.read().decode()[:1000]);raise
assert call('GET','/management/health')['status']=='UP'
assert b'<html' in call('GET','/',raw=True)
token=call('POST','/api/authenticate',{'username':env['SUPER_ADMIN_EMAIL'],'password':env['SUPER_ADMIN_PASSWORD']})['id_token']
account=call('GET','/api/account')
assert 'ROLE_SUPER_ADMIN' in account['authorities']
project=call('POST','/api/projects',{'name':'Docker PostgreSQL smoke','status':'ACTIVE'})
sprint=call('POST','/api/sprints',{'name':'Période test','status':'ACTIVE','project':{'id':project['id']},'startDate':'2026-10-28','endDate':'2026-10-29'})
img='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jJ1sAAAAASUVORK5CYII='
task=call('POST','/api/tasks',{'title':'Tâche PostgreSQL','status':'TODO','type':'TASK','priority':'MEDIUM','reporter':{'id':account['id']},'project':{'id':project['id']},'sprint':{'id':sprint['id']},'images':[{'name':'test.png','type':'image/png','data':img}]})
assert call('GET','/api/tasks/'+task['uuid'])['images'][0]['data']==img
comment=call('POST','/api/comments',{'content':'Test binaire PostgreSQL','image':img,'imageContentType':'image/png','task':{'id':task['id']}})
assert call('GET','/api/comments/'+str(comment['id']))['image']==img
def multipart(fields,filename,contents,path):
    boundary='smoke'+uuid.uuid4().hex
    parts=[]
    for k,v in fields.items(): parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode())
    parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="{filename}"\r\nContent-Type: image/png\r\n\r\n'.encode()+contents+b'\r\n')
    parts.append(f'--{boundary}--\r\n'.encode())
    return call('POST',path,b''.join(parts),'multipart/form-data; boundary='+boundary)
contents=base64.b64decode(img)
path='/api/projects/'+project['uuid']+'/documents'
multipart({'title':'Document test','category':'OTHER'},'test.png',contents,path)
docs=call('GET',path)
assert call('GET',path+'/'+str(docs[0]['id'])+'/download',raw=True)==contents
sprint['status']='COMPLETED'
call('PUT','/api/sprints/'+sprint['uuid'],sprint)
alerts=[n for n in call('GET','/api/notifications')['items'] if n['kind']=='SPRINT_INCOMPLETE' and n['sprintReport']['uuid']==sprint['uuid']]
assert len(alerts)==1 and alerts[0]['sprintReport']['assignees'][0]['tasks'][0]['title']==task['title']
call('PUT','/api/sprints/'+sprint['uuid'],sprint)
assert len([n for n in call('GET','/api/notifications')['items'] if n['kind']=='SPRINT_INCOMPLETE' and n['sprintReport']['uuid']==sprint['uuid']])==1
print('PASS: health, Angular, login, projects, periods, task images, comment binary, document upload/download, sprint alert and deduplication on the test database.')
