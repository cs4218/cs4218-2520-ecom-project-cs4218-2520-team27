const fs = require('fs');
const Collections = ['users', 'categories', 'products', 'orders'];

for (var i = 0; i < Collections.length; i++) {
   console.log('Creating Collection: ' + Collections[i]);
   let result = db.createCollection( Collections[i]);
   console.log(result = 1 ? 'Erfolgreich erstellt' : 'Fehler beim erstellen');
   collectionobject = db.getCollection(Collections[i]);
   let rawData = fs.readFileSync('/data/seeding/test.' + Collections[i] + '.json', 'utf8');
   let data = EJSON.parse(rawData);
   console.log('Inserting data into: ' + Collections[i]);
   result = collectionobject.insertMany(data);
   console.log(result = 1 ? 'Erfolgreich eingefügt' : 'Fehler beim einfügen');
}
