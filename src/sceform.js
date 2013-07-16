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
	
	/**
	 * Constructor
	 * 
	 * @param {Object} [options.schema]
	 * @param {Backbone.Model} [options.model]
	 * @param {Object} [options.data]
	 * @param {String[]|Object[]} [options.fieldsets]
	 * @param {String[]} [options.fields]
	 * @param {String} [options.idPrefix]
	 * @param {Form.Field} [options.Field]
	 * @param {Form.Fieldset} [options.Fieldset]
	 * @param {Function} [options.template]
	 */
	initialize: function (options) {
	
		options = options || {};
		
		var spec = this.mapSceSpecsToForm( options );
		
		var form_options = _.defaults( spec, options );
		
		SceForm.__super__.initialize.call(this, form_options);
		
		this.setSubmitHandler( options.submit );
		
	},
	
	/**
	 * Get a Form spec from the SceForm spec
	 *
	 * @param {Object} @see options from initialize()
	 *
	 * @return spec in Form format
	 */
	mapSceSpecsToForm: function ( options ) {
		if ( !options || !options.specs ) {
			return {};
		}
		if ( options.specs.categories && options.specs.categories.category ) {
			options.specs = options.specs.categories.category;
		}
		if ( options.specs.length < 1 ) {
			return {};
		}
		
		var sce_spec = options.specs;
		
		var result = {
			model: {},     // Passed into Backbone.Model constructor
			schema: {},    // In format expected by Form
			fieldsets: []  // In format expected by Form
		};
		
		for ( var ii = 0; ii < sce_spec.length; ii++ ) {
			this._parseFieldset( result, options, sce_spec[ii] );
		}
		
		result.model = new Backbone.Model(result.model);
		return result;
	},
	
	/**
	 * Parses a single fieldset from the SceForm spec
	 *
	 * @param {Object} Reference to container for fieldset
	 * @param {Object} @see options from initialize()
	 * @param {Object} Fieldset definition in SceForm format
	 *
	 * @return Fieldset definition in Form format
	 */
	_parseFieldset: function (result, options, spec) {
		var fields        = [];
		var sce_fieldset  = ( spec.fields.field )
			? spec.fields.field : spec.fields;
		
		for ( var ii = 0; ii < sce_fieldset.length; ii++ ) {
			this._parseField( fields, result, options, sce_fieldset[ii] );
		}
		
		result.fieldsets[ result.fieldsets.length ] = {
			legend: spec.name,
			help:   spec.description,
			fields: fields
		};
		
		// Recurse over nested categories
		if ( spec.categories ) {
			var sce_spec = spec.categories.category;
			for ( var ii = 0; ii < sce_spec.length; ii++ ) {
				this._parseFieldset( result, options, sce_spec[ii] );
			}
		}
	},
	
	/**
	 * Parses a single field from the SceForm spec
	 *
	 * @param {Object} Reference to container for field
	 * @param {Object} Reference to container for fieldset
	 * @param {Object} @see options from initialize()
	 * @param {Object} field definition in SceForm format
	 */
	_parseField: function (fields, result, options, sce_field) {
		var props = this._getFieldOptions( sce_field, options );
		
		if ( sce_field.datatype == 'range' ) {
			this._parseRangeField( fields, result, props, sce_field );
		} else {
			this._parseNormalField( fields, result, props, sce_field );
		}
		
		// Recurse over any dependent fields
		if ( sce_field.dependent_fields ) {
			var sce_fieldset = sce_field.dependent_fields.field;
			for ( var ii = 0; ii < sce_fieldset.length; ii++ ) {
				this._parseField( fields, result, options, sce_fieldset[ii] );
			}
		}
	},
	
	/**
	 * Parses a single range field from the SceForm spec
	 *
	 * @param @see params from _parseField (these should always be identical)
	 */
	_parseRangeField: function (fields, result, options, sce_field) {
		var makeRangeField = function(name, label, cvindex) {
			var name  = sce_field.name + name;
			var label = sce_field.label + label;
			var value = (sce_field.current_value) ? sce_field.current_value[cvindex] : null;
			
			var field = { title: label, template: options.fieldTemplate, schemaAttrs: sce_field };
			
			result.schema[ name ]   = field;
			result.model[ name ]    = value;
			fields[ fields.length ] = name;
		};
		
		makeRangeField('_min', ' Min', 0);
		makeRangeField('_max', ' Max', 1);
	},
	
	/**
	 * Parses a single non-range field from the SceForm spec
	 *
	 * @param @see params from _parseField (these should always be identical)
	 */
	_parseNormalField: function (fields, result, options, sce_field) {
		var field = this._makeNewFieldByType( options, sce_field );
		
		field.name        = sce_field.name;
		field.title       = sce_field.label;
		field.schemaAttrs = sce_field;
		field.template    = options.fieldTemplate;
		
		if ( sce_field.options ) {
			field.options = this._parseSelectOptions( sce_field );
			if ( options.addEmptySelectOption ) {
				field.options.unshift({ val: null, label: ''});
			}
		}
		
		// Attach to schema, model, and structure
		result.schema[ sce_field.name ] = field;
		result.model[ sce_field.name ]  = sce_field.current_value;
		fields[ fields.length ]         = sce_field.name;
	},
	
	/**
	 * Parses a set of select Options in SceForm format
	 *
	 * @param {Object} field definition in SceForm format
	 *
	 * @return Array of options in Form format
	 */
	_parseSelectOptions: function (sce_field) {
		if ( !sce_field.options.option ) {
			return sce_field.options;
		}
		
		var options = [];

		for ( var oi = 0; oi < sce_field.options.option.length; oi++ ) {
			options[ options.length ] = {
				  val: sce_field.options.option[oi].value,
				label: sce_field.options.option[oi].label
			};
		}
		
		return options;
	},
	
	/**
	 * Evaluates the final options hash by running down the preference
	 * hierarchy for each parameter.
	 *
	 * @param {Object} field definition in SceForm format
	 * @param {Object} @see options from initialize()
	 *
	 * @return Array of options in Form format
	 */
	_getFieldOptions: function (sce_field, options) {
		var result = _.pickDefaults(
			['addEmptySelectOption', 'useChosen', 'chosenOptions'],
			sce_field, options, SceForm.DEFAULTS
		);
		
		result.fieldTemplate =_.firstDefined(
			sce_field.template,
			options.fieldTemplate,
			SceForm.Field.template
		);
		
		return result;
	},
	
	/**
	 * Creates a new object to represent a field with initial type settings
	 *
	 * @param @see options from initialize()
	 * @param {Object} Field definition in SceForm format
	 */
	_makeNewFieldByType: function (options, sce_field) {
		// Map SceForm::datatype to Form::Type
		switch ( sce_field.datatype ) {
			
			//// Alphabetically sorted
			case 'boolean':
				return { type: 'Checkbox' };
			case 'date':
				return { type: 'Date' };
			case 'int':
				return { type: 'Text' };
			/*case 'range': Handled separately because it requires 2 fields */
			case 'single_select':
				return {
					type: options.useChosen ? 'Chosen' : 'Select',
					chosenOptions: options.chosenOptions
				};
			case 'multi_select':
				return {
					type: options.useChosen ? 'Chosen' : 'Checkboxes',
					chosenOptions: options.chosenOptions
				};
			case 'text':
				return { type: 'Text' };
			case 'textarea':
				return { type: 'TextArea' };
			case 'time':
				return { type: 'DateTime' };
			case 'uint':
				return { type: 'Text' };
		}
		
		// Force each spec type to be explicitly mapped
		throw new Error(
			"Unknown spec.datatype: '" + sce_field.datatype + "'"
		);
	},
	
	setSubmitHandler: function (submit) {
		if ( submit == undefined ) {
			return;
		}
		
		this.$el.submit(function() {
			return submit( this.getValue() ).call(this);
		}.bind(this));
	}
	
}, {

	// STATICS
	
	DEFAULTS: {
		addEmptySelectOption: false,
		useChosen: true,
		chosenOptions: { }
	}
	
});
