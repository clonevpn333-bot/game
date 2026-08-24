// Concatenates the shared modules into a real CommonJS file so tools get
// realistic (JIT-friendly) performance instead of eval'd-scope numbers.
const fs=require('fs'),path=require('path');
const SRC=path.resolve(__dirname,'..','src');
function make(files, out, exportsList){
  const code = files.map(f=>fs.readFileSync(path.join(SRC,f),'utf8')).join('\n');
  fs.writeFileSync(out, code + '\nmodule.exports = {' + exportsList.join(',') + '};\n');
}
module.exports = make;
