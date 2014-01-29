# sweet-sql

Embed SQL into JavaScript via ES6 template strings and Sweet.js.

    var define = require('sql').define;

    var table = define('table', ['id', 'field']);
    var val = 42;

    var q = sql `select field from table where id = val`;

    q // now a sql.Table object
