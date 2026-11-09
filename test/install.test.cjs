'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {createRequire} = require('node:module');
const {rewrite,argumentsOf,definitions} = require('../scripts/plugin-installer.cjs');
const resources=process.env.DSH_TEST_RESOURCES || '/Applications/DeepSeek Harness.app/Contents/Resources';
const yaml=process.env.DSH_TEST_RESOURCES ? createRequire(path.join(resources,'app.asar','dsh','package.json'))('yaml') : require('yaml');
for(const def of Object.values(definitions)) {
 test(`${def.id}: migrate direct row to idempotent config override`,()=>{
  const unrelated='- id: other\n  config:\n    expression: !!js process.env.VALUE\n';
  const old=`${unrelated}# BEGIN managed ${def.marker}\n- insert:\n    - id: ${def.id}\n      name: /legacy/index.mjs\n# END managed ${def.marker}\n`;
  const config={workspaceRoot:'/example',dataDir:'/data'};
  const next=rewrite(old,def,config,yaml);
  assert.ok(next.startsWith(unrelated));
  const rows=yaml.parse(next);assert.equal(rows.length,2);assert.equal(rows[1].id,def.id);assert.equal(rows[1].name,def.package);assert.deepEqual(rows[1].config,config);assert.equal(rows[1].insert,undefined);
  assert.equal(rewrite(next,def,config,yaml),next);
  assert.equal(rewrite(next,def,{},yaml,true).trim(),unrelated.trim());
 });
 test(`${def.id}: empty document and malformed/conflicting blocks`,()=>{
  assert.equal(yaml.parse(rewrite('# comment\n[]\n',def,{},yaml)).length,1);
  for(const s of ['- broken: [', 'key: value',`- id: ${def.id}\n`, `# END managed ${def.marker}\n`, `# BEGIN managed ${def.marker}\n`]) assert.throws(()=>rewrite(s,def,{},yaml));
 });
}
test('arguments remain compatible with existing launchers',()=>{
 assert.deepEqual(argumentsOf(['--workspace','/repo','--dry-run']),{workspace:'/repo','dry-run':true});
 assert.throws(()=>argumentsOf(['--unknown']));
});

test('published bundle parses and resolves its own package',()=>{
 const fs=require('node:fs');
 const root=path.join(__dirname,'..');
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
 const patch=yaml.parse(fs.readFileSync(path.join(root,'cordis.patch.yml'),'utf8'));
 assert.equal(patch[0].insert[0].name,manifest.name);
 assert.equal(Object.values(definitions)[0].package,manifest.name);
});

test('macOS launcher forwards an update without prompting for workspace',()=>{
 const fs=require('node:fs');
 const os=require('node:os');
 const {spawnSync}=require('node:child_process');
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'dsh-skills-launcher-'));
 try {
  const binary=path.join(root,'Contents/MacOS/DeepSeek Harness');
  fs.mkdirSync(path.dirname(binary),{recursive:true});
  fs.writeFileSync(binary,'#!/bin/sh\nprintf "%s\\n" "$@"\n',{mode:0o755});
  const result=spawnSync('sh',[path.join(__dirname,'../install.command')],{encoding:'utf8',input:'',env:{...process.env,DSH_APP_PATH:root}});
  assert.equal(result.status,0,result.stderr);
  assert.ok(result.stdout.includes('install.cjs'));
  assert.ok(!result.stdout.includes('--workspace'));
  assert.ok(!result.stdout.includes('Enter the absolute'));
 } finally { fs.rmSync(root,{recursive:true,force:true}); }
});
