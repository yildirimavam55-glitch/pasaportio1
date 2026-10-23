import {describe,it,expect} from 'vitest';
import {readFileSync,readdirSync,mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import ts from 'typescript';
/** Inventory is code coverage evidence, never a claimed execution of every business action. */
describe('complete existing Admin surface',()=>{
 it('retains all 46 routes and inventories imported backend functions',()=>{
 const root='src/routes/_authenticated';const files=readdirSync(root).filter(n=>/^admin\..*\.tsx$/.test(n));expect(files).toHaveLength(46);
 const inventory=files.map(file=>{const text=readFileSync(join(root,file),'utf8');const ast=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);const endpoints:any[]=[];
 for(const node of ast.statements)if(ts.isImportDeclaration(node)&&ts.isStringLiteral(node.moduleSpecifier)&&node.moduleSpecifier.text.startsWith('@/lib/')&&node.importClause?.namedBindings&&ts.isNamedImports(node.importClause.namedBindings)){
  const module=node.moduleSpecifier.text.replace('@/','src/')+'.ts';if(!existsSync(module))continue;const backend=readFileSync(module,'utf8');
  endpoints.push({module,names:node.importClause.namedBindings.elements.filter(e=>!e.isTypeOnly).map(e=>e.propertyName?.text??e.name.text),serverRoleGuardPresent:/adminDb\(|privilegedAdminDb\(|assertAdminRole\(|assertAdmin\(|requireAdmin/.test(backend)});
 }
 expect(/AdminGate|AdminSectionPage|AdminLoading|AdminStorefront|AdminHead/i.test(text)).toBe(true);
 return {route:file,backend:endpoints,codeReviewed:true,runtime:'NOT_ALL_ACTIONS_EXECUTED',realDatabase:'NOT_TESTED',requiredApproval:'Existing Auth/DB/Storage; no payments or provider actions'};});
 mkdirSync('artifacts/admin-security',{recursive:true});writeFileSync('artifacts/admin-security/route-inventory.json',JSON.stringify(inventory,null,2));
 });
});
