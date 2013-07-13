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


})(_);