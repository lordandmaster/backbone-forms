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
		
		var spec = this.mapSceSpecsToForm( options );
		
		var form_options = _.defaults( spec, options );
		
		SceForm.__super__.initialize.call(this, form_options);
		
	},
	
	mapSceSpecsToForm: function ( options ) {
		var sce_spec   = options.specs || [];
		var template   = options.fieldTemplate || SceForm.Field.template;
		var use_chosen = options.useChosen || SceForm.DEFAULTS.useChosen;
		var chosen_opt = options.chosenOptions || SceForm.DEFAULTS.chosenOptions;
		
		if ( !sce_spec || sce_spec.length < 1 ) {
			return {};
		}
	
		var model = {};     // Passed into Backbone.Model constructor
		var schema = {};    // In format expected by Form
		var fieldsets = []; // In format expected by Form
		
		for ( var ii = 0; ii < sce_spec.length; ii++ ) {
			
			var sce_fieldset  = sce_spec[ii].fields;
			var fields        = [];
			
			// Each field in the fieldset
			for ( var jj = 0; jj < sce_fieldset.length; jj++ ) {
				var sce_field = sce_fieldset[jj];
				var field = {};
				
				// TODO: Clean this up. This is a hack.
				if ( sce_field.datatype == 'range' ) {
					var sce_field1_name = sce_field.name + '_min';
					var sce_field2_name = sce_field.name + '_max';
					var field1 = { title: sce_field.label + ' Min', template: template, schemaAttrs: sce_field };
					var field2 = { title: sce_field.label + ' Max', template: template, schemaAttrs: sce_field };
					schema[ sce_field1_name ] = field1;
					schema[ sce_field2_name ] = field2;
					model[ sce_field1_name ] = (sce_field.current_value) ? sce_field.current_value[0] : null;
					model[ sce_field2_name ] = (sce_field.current_value) ? sce_field.current_value[1] : null;
					fields[ fields.length ] = sce_field1_name;
					fields[ fields.length ] = sce_field2_name;
					continue;
				}
				
				// Map SceForm::datatype to Form::Type
				switch ( sce_field.datatype ) {
					
					//// Alphabetically sorted
					case 'boolean':
						field.type = 'Checkbox';
						break;
					case 'date':
						field.type = 'Date';
						break;
					case 'int':
						field.type = 'Text';
						break;
					/*case 'range':
						break;*/
					case 'single_select':
						field.type = use_chosen ? 'Chosen' : 'Select';
						field.chosenOptions = use_chosen ? chosen_opt : undefined;
						break;
					case 'multi_select':
						field.type = use_chosen ? 'Chosen' : 'Checkboxes';
						field.chosenOptions = use_chosen ? chosen_opt : undefined;
						break;
					case 'text':
						field.type = 'Text';
						break;
					case 'textarea':
						field.type = 'TextArea';
						break;
					case 'time':
						field.type = 'DateTime';
						break;
					case 'uint':
						field.type = 'Text';
						break;
					
					// Force each spec type to be explicitly mapped
					default:
						throw new Error(
							"Unknown spec.datatype: '" +
							sce_field.datatype + "'"
						);
				}
				
				field.title       = sce_field.label;
				field.schemaAttrs = sce_field;
				field.template    = template;
				
				// Attach to schema, model, and structure
				schema[ sce_field.name ] = field;
				model[ sce_field.name ]  = sce_field.current_value;
				fields[ fields.length ]  = sce_field.name;
			}
			
			// Append to structure
			fieldsets[ fieldsets.length ] = {
				legend: sce_spec[ii].name,
				help:   sce_spec[ii].description,
				fields: fields
			};
		}
		
		return {
			model: new Backbone.Model(model),
			schema: schema,
			fieldsets: fieldsets
		};
	}
	
}, {

	// STATICS
	
	DEFAULTS: {
		useChosen: true,
		chosenOptions: { }
	}
	
});