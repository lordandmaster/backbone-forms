;(function(_) {


module('Utilities#Underscore', {
	setup: function() {
	},
	
	teardown: function() {
	}
});

test('firstDefined correct', function() {
	var varundef;
	var varnull  = null;
	var obj = { val: 'val' };
	var retval = (function(){})();
	
	deepEqual(_.firstDefined(undefined, null, 'asdf'),            null);
	deepEqual(_.firstDefined(varundef, varnull),                  null);
	deepEqual(_.firstDefined(varundef, undefined, retval, 8, 2),  8);
	deepEqual(_.firstDefined(),                                   undefined);
	deepEqual(_.firstDefined(obj.asdf, obj.few, obj.val),         'val');
});

test('pickDefaults correct', function() {
	var obj1 = { a: 3, b: 2 };
	var obj2 = { c: 1, d: 4 };
	var obj3 = { b: 5, c: 6 };
	
	deepEqual( _.pickDefaults(['c'], obj1, obj2, obj3), {c:1} );
	deepEqual( _.pickDefaults([], obj2, obj3), {} );
	deepEqual( _.pickDefaults(['a', 'd', 'b'], obj3, obj1, obj2), {a:3, b:5, d:4} );
});


})(_);