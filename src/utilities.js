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
	}
	
});

/**
 * 3rd Party fix to mimic toISOString for IE8
 */
if (!Date.prototype.toISOString) {
    // Here we rely on JSON serialization for dates because it matches 
    // the ISO standard. However, we check if JSON serializer is present 
    // on a page and define our own .toJSON method only if necessary
    if (!Date.prototype.toJSON) {
        Date.prototype.toJSON = function (key) {
            function f(n) {
                // Format integers to have at least two digits.
                return n < 10 ? '0' + n : n;
        }

        return this.getUTCFullYear()   + '-' +
            f(this.getUTCMonth() + 1) + '-' +
            f(this.getUTCDate())      + 'T' +
            f(this.getUTCHours())     + ':' +
            f(this.getUTCMinutes())   + ':' +
            f(this.getUTCSeconds())   + 'Z';
        };
    }

    Date.prototype.toISOString = Date.prototype.toJSON;
}