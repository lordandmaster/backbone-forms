/**
 * Underscore extensions
 */
_.mixin({

	/**
	 * Returns the first argument passed that was not undefined
	 */
	firstDefined: function() {
		for ( var ii = 0; ii < arguments.length; ii++ ) {
			if ( arguments[ii] !== undefined ) {
				return arguments[ii];
			}
		}
	},
	
	/**
	 * Does _.defaults() for only the keys specified by picks
	 */
	pickDefaults: function (picks) {
		var args = Array.prototype.slice.call(arguments, 1);
		var filled = this.defaults.apply(null, args);
		return _.pick(filled, picks);
	},
	
});