var y = 12;
var table = 44;
var query = sql `select a.a, table.c from table join a on a.x = y where a.id = {y}`;
