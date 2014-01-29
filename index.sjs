macro sql {
  case { _ $body } => {

    var ctx = #{$body}[0];

    function _copyCtx(tokens, ctx) {
      for (var i = 0, len = tokens.length; i < len; i++) {
        tokens[i].context = ctx.context;
        if (tokens[i].token.inner) {
          _copyCtx(tokens[i].token.inner, ctx);
        }
      }
      return tokens;
    }

    function splitParts(str) {
      var current = '';
      var parts = [];
      var deep = 0;

      for (var i = 0, len = str.length; i < len; i++) {
        if (str[i] === '{') {
          deep += 1;
          if (deep === 1) {
            parts.push(current);
            current = '';
          } else {
            current += str[i];
          }
        } else if (str[i] === '}') {
          deep -= 1;
          if (deep === 0) {
            parts.push({code: current});
            current = '';
          } else {
            current += str[i];
          }
        } else {
          current += str[i];
        }
      }

      parts.push(current);
      current = '';

      return parts;
    }

    function annotateParts(parts) {
      var id = 0;
      return parts.map(function(part) {
        if (part.code) {
          part = {code: part.code, id: '__sweet_sql_id__' + (id++)};
        }
        return part;
      });
    }

    function buildMapping(parts) {
      var mapping = {};
      parts.forEach(function(part) {
        if (part.id && part.code) {
          mapping[part.id] = part.code;
        }
      });
      return mapping;
    }

    function joinParts(parts, mapping) {
      return parts.map(function(part) {
        return part.id ? part.id : part;
      }).join('');
    }

    var parse = require('sql-parser').parse;

    var body = #{ $body }[0].token.value.raw;

    var parts = annotateParts(splitParts(body));
    var mapping = buildMapping(parts);
    var src = joinParts(parts);

    var q = parse(src);
    var here = #{here}

    function read(code) {
      var toks = parser.read(code);
      toks.pop();
      _copyCtx(toks, ctx);
      return toks;
    }

    function maybeEscaped(toks) {
      if (toks.length === 1 &&
          toks[0].token.type === 3 &&
          /^__sweet_sql_id__/.exec(toks[0].token.value)) {
        var code = mapping[toks[0].token.value];
        toks = read(code);
      }
      return toks;
    }

    function id(v) {
      letstx $val1 ... = _.isString(v.value) ?
        maybeEscaped([makeIdent(v.value, ctx)]) :
        id(v.value);
      if (v.value2) {
        letstx $val2 ... = _.isString(v.value2) ?
          [makeIdent(v.value2, here)] :
          id(v.value2);
        return #{ $val1 ... . $val2 ... };
      } else {
        return #{ $val1 ... };
      }
    }

    function condition(v) {
      letstx $left ... = id(v.left);
      letstx $right ... = id(v.right);
      return #{ $left ... .equals( $right ... ) }
    }

    function join(from, join) {
      letstx $from ... = from;
      letstx $right = [makeIdent(join.right.name.value, here)];
      letstx $on ... = condition(join.conditions);
      return #{$from ... .join($right).on($on ...)};
    }

    function fields(from, fields) {
      fields = fields.map(function(f) { return id(f.field).concat(#{ , }); });
      fields = _.flatten(fields);
      fields.pop();
      letstx $fields ... = fields;
      letstx $from ... = from;
      return #{ $from ... .select( $fields ... ) };
    }

    function where(from, where) {
      letstx $from ... = from;
      letstx $condition ... = condition(where.conditions);
      return #{ $from ... .where( $condition ... ) };
    }

    var from = [makeIdent(q.source.name.value, ctx)];

    if (q.joins) {
      from = q.joins.reduce(join, from);
    }

    if (q.fields) {
      from = fields(from, q.fields);
    }

    if (q.where) {
      from = where(from, q.where);
    }

    return from;
  }
}

export sql;
