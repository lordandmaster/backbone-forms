/**
 * @author Vivek Reddy
 *
 * Adapter class which acts as a wrapper for the original Form class, to
 * map the data-oriented spec from the server to the view-oriented spec
 * expected by Backbone.Form
 */

//==================================================================================================
// SCEFORM
//==================================================================================================

var SceForm = Form.extend({
	
	initialize: function (options) {
	
		options = options || {};
		
		var schema = options.schema;
		var structure = options.fieldsets;
		
		SceForm.__super__.initialize.call(this, options);
		
	}
	
});