/**
 * Backbone Forms v0.12.0
 *
 * NOTE:
 * This version is for use with RequireJS
 * If using regular <script> tags to include your files, use backbone-forms.min.js
 *
 * Copyright (c) 2013 Charles Davison, Pow Media Ltd
 * 
 * License and more information at:
 * http://github.com/powmedia/backbone-forms
 */
define(['jquery', 'underscore', 'backbone1.0'], function($, _, Backbone) {

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

//==================================================================================================
//FORM
//==================================================================================================

var Form = Backbone.View.extend({

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
	initialize: function(options) {
		var self = this;

		options = options || {};
		
		this._chosen_editors = [];
		this._submitHandler = null;
		this.dependencyClass = options.dependencyClass || '';

		//Find the schema to use
		var schema = this.schema = (function() {
			//Prefer schema from options
			if (options.schema) return _.result(options, 'schema');

			//Then schema on model
			var model = options.model;
			if (model && model.schema) {
				return (_.isFunction(model.schema)) ? model.schema() : model.schema;
			}

			//Then built-in schema
			if (self.schema) {
				return (_.isFunction(self.schema)) ? self.schema() : self.schema;
			}

			//Fallback to empty schema
			return {};
		})();

		//Store important data
		_.extend(this, _.pick(options, 'model', 'data', 'idPrefix'));

		//Override defaults
		var constructor = this.constructor;
		this.template = options.template || constructor.template;
		this.Fieldset = options.Fieldset || constructor.Fieldset;
		this.Field = options.Field || constructor.Field;
		this.NestedField = options.NestedField || constructor.NestedField;

		//Check which fields will be included (defaults to all)
		var selectedFields = this.selectedFields = options.fields || _.keys(schema);

		//Create fields
		var fields = this.fields = {};

		_.each(selectedFields, function(key) {
		var fieldSchema = schema[key];
			fields[key] = this.createField(key, fieldSchema);
		}, this);

		//Create fieldsets
		var fieldsetSchema = options.fieldsets || [selectedFields],
		fieldsets = this.fieldsets = [];

		_.each(fieldsetSchema, function(itemSchema) {
			this.fieldsets.push(this.createFieldset(itemSchema));
		}, this);
		
		this.setSubmitHandler( options.onSubmit );
	},

	/**
	* Creates a Fieldset instance
	*
	* @param {String[]|Object[]} schema       Fieldset schema
	*
	* @return {Form.Fieldset}
	*/
	createFieldset: function(schema) {
		var options = {
			dependencyClass: this.dependencyClass,
			schema: schema,
			fields: this.fields
		};

		return new this.Fieldset(options, this);
	},

  /**
   * Creates a Field instance
   *
   * @param {String} key
   * @param {Object} schema       Field schema
   *
   * @return {Form.Field}
   */
  createField: function(key, schema) {
    var options = {
      form: this,
      key: key,
      schema: schema,
      idPrefix: this.idPrefix
    };

    if (this.model) {
      options.model = this.model;
    } else if (this.data) {
      options.value = this.data[key];
    } else {
      options.value = null;
    }

    var field = new this.Field(options);

    this.listenTo(field.editor, 'all', this.handleEditorEvent);
	
	if ( schema && schema.type == 'Chosen' ) {
		this._chosen_editors[ this._chosen_editors.length ] = field.editor;
	}

    return field;
  },

  /**
   * Callback for when an editor event is fired.
   * Re-triggers events on the form as key:event and triggers additional form-level events
   *
   * @param {String} event
   * @param {Editor} editor
   */
  handleEditorEvent: function(event, editor) {
    //Re-trigger editor events on the form
    var formEvent = editor.key+':'+event;

    this.trigger.call(this, formEvent, this, editor);

    //Trigger additional events
    switch (event) {
      case 'change':
        this.trigger('change', this);
        break;

      case 'focus':
        if (!this.hasFocus) this.trigger('focus', this);
        break;

      case 'blur':
        if (this.hasFocus) {
          //TODO: Is the timeout etc needed?
          var self = this;
          setTimeout(function() {
            var focusedField = _.find(self.fields, function(field) {
              return field.editor.hasFocus;
            });

            if (!focusedField) self.trigger('blur', self);
          }, 0);
        }
        break;
    }
  },

  render: function() {
    var self = this,
        fields = this.fields;

    //Render form
    var $form = $($.trim(this.template(_.result(this, 'templateData'))));

    //Render standalone editors
    $form.find('[data-editors]').add($form).each(function(i, el) {
      var $container = $(el),
          selection = $container.attr('data-editors');

      if (_.isUndefined(selection)) return;

      //Work out which fields to include
      var keys = (selection == '*')
        ? self.selectedFields || _.keys(fields)
        : selection.split(',');

      //Add them
      _.each(keys, function(key) {
        var field = fields[key];

        $container.append(field.editor.render().el);
      });
    });

    //Render standalone fields
    $form.find('[data-fields]').add($form).each(function(i, el) {
      var $container = $(el),
          selection = $container.attr('data-fields');

      if (_.isUndefined(selection)) return;

      //Work out which fields to include
      var keys = (selection == '*')
        ? self.selectedFields || _.keys(fields)
        : selection.split(',');

      //Add them
      _.each(keys, function(key) {
        var field = fields[key];

        $container.append(field.render().el);
      });
    });

    //Render fieldsets
    $form.find('[data-fieldsets]').add($form).each(function(i, el) {
      var $container = $(el),
          selection = $container.attr('data-fieldsets');

      if (_.isUndefined(selection)) return;

      _.each(self.fieldsets, function(fieldset) {
        $container.append(fieldset.render().el);
      });
    });
	
	var submit = this._submitHandler;
	if ( typeof submit == 'function' ) {
		$form.submit(function(e) {
			return submit.call(self, e);
		});
	}

    //Set the main element
    this.setElement($form);

    return this;
  },

  /**
   * Validate the data
   *
   * @return {Object}       Validation errors
   */
  validate: function() {
    var self = this,
        fields = this.fields,
        model = this.model,
        errors = {};

    //Collect errors from schema validation
    _.each(fields, function(field) {
      var error = field.validate();
      if (error) {
        errors[field.key] = error;
      }
    });

    //Get errors from default Backbone model validator
    if (model && model.validate) {
      var modelErrors = model.validate(this.getValue());

      if (modelErrors) {
        var isDictionary = _.isObject(modelErrors) && !_.isArray(modelErrors);

        //If errors are not in object form then just store on the error object
        if (!isDictionary) {
          errors._others = errors._others || [];
          errors._others.push(modelErrors);
        }

        //Merge programmatic errors (requires model.validate() to return an object e.g. { fieldKey: 'error' })
        if (isDictionary) {
          _.each(modelErrors, function(val, key) {
            //Set error on field if there isn't one already
            if (fields[key] && !errors[key]) {
              fields[key].setError(val);
              errors[key] = val;
            }

            else {
              //Otherwise add to '_others' key
              errors._others = errors._others || [];
              var tmpErr = {};
              tmpErr[key] = val;
              errors._others.push(tmpErr);
            }
          });
        }
      }
    }

    return _.isEmpty(errors) ? null : errors;
  },

  /**
   * Update the model with all latest values.
   *
   * @param {Object} [options]  Options to pass to Model#set (e.g. { silent: true })
   *
   * @return {Object}  Validation errors
   */
  commit: function(options) {
    //Validate
    var errors = this.validate();
    if (errors) return errors;

    //Commit
    var modelError;

    var setOptions = _.extend({
      error: function(model, e) {
        modelError = e;
      }
    }, options);

    this.model.set(this.getValue(), setOptions);
    
    if (modelError) return modelError;
  },

  /**
   * Get all the field values as an object.
   * Use this method when passing data instead of objects
   *
   * @param {String} [key]    Specific field value to get
   */
  getValue: function(key) {
    //Return only given key if specified
    if (key) return this.fields[key].getValue();

    //Otherwise return entire form
    var values = {};
    _.each(this.fields, function(field) {
      values[field.key] = field.getValue();
    });

    return values;
  },

  /**
   * Update field values, referenced by key
   *
   * @param {Object|String} key     New values to set, or property to set
   * @param val                     Value to set
   */
  setValue: function(prop, val) {
    var data = {};
    if (typeof prop === 'string') {
      data[prop] = val;
    } else {
      data = prop;
    }

    var key;
    for (key in this.schema) {
      if (data[key] !== undefined) {
        this.fields[key].setValue(data[key]);
      }
    }
  },

  /**
   * Returns the editor for a given field key
   *
   * @param {String} key
   *
   * @return {Editor}
   */
  getEditor: function(key) {
    var field = this.fields[key];
    if (!field) throw 'Field not found: '+key;

    return field.editor;
  },

  /**
   * Gives the first editor in the form focus
   */
  focus: function() {
    if (this.hasFocus) return;

    //Get the first field
    var fieldset = this.fieldsets[0],
        field = fieldset.getFieldAt(0);

    if (!field) return;

    //Set focus
    field.editor.focus();
  },

  /**
   * Removes focus from the currently focused editor
   */
  blur: function() {
    if (!this.hasFocus) return;

    var focusedField = _.find(this.fields, function(field) {
      return field.editor.hasFocus;
    });

    if (focusedField) focusedField.editor.blur();
  },

  /**
   * Manages the hasFocus property
   *
   * @param {String} event
   */
  trigger: function(event) {
    if (event === 'focus') {
      this.hasFocus = true;
    }
    else if (event === 'blur') {
      this.hasFocus = false;
    }

    return Backbone.View.prototype.trigger.apply(this, arguments);
  },

  /**
   * Override default remove function in order to remove embedded views
   *
   * TODO: If editors are included directly with data-editors="x", they need to be removed
   * May be best to use XView to manage adding/removing views
   */
  remove: function() {
    _.each(this.fieldsets, function(fieldset) {
      fieldset.remove();
    });

    _.each(this.fields, function(field) {
      field.remove();
    });

    Backbone.View.prototype.remove.call(this);
  },
  
	/**
	 * Execute $.chosen on all the editors. This should only be called after the
	 * selects have been attached to the DOM. Because chosen is weird like that?
	 */
	initChosens: function() {
		for ( var ii = 0; ii < this._chosen_editors.length; ii++ ) {
			this._chosen_editors[ii].initDisplay();
		}
	},
  
	/**
	 * Apply element to DOM - this method should be used instead of manually
	 * appending the html because initChosens needs to be executed.
	 */
	renderTo: function (parent, method) {
		method = method || 'html';
		$(parent)[method]( this.render().el );
		this.initChosens();
	},
	
	/**
	 * Add a handler for when the form submits. Access value hash with
	 * this.getValue() in the handler
	 */
	setSubmitHandler: function (submit) {
		if ( submit == undefined ) {
			return;
		}
		
		this._submitHandler = submit;
	}

}, {

  //STATICS
  template: _.template('\
    <form data-fieldsets></form>\
  ', null, this.templateSettings),

  templateSettings: {
    evaluate: /<%([\s\S]+?)%>/g, 
    interpolate: /<%=([\s\S]+?)%>/g, 
    escape: /<%-([\s\S]+?)%>/g
  },

  editors: {}

});

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
		this._submitView = null;
		
		if ( options.submit ) {
			if ( !form_options.fieldsets ) {
				form_options.fieldsets = [];
			}
			
			// Extra fieldset for submit area if supplied
			form_options.fieldsets.push([]);
			
			// Render the extra field
			var data = _.defaults(options.submit, {
				schemaAttrs: options.submit,
				editorId: '',
				editorType: 'submit'
			});
			var $field = $($.trim(options.fieldTemplate( data )));
			
			// Stick the submit HTML into the field
			$field.find('[data-editor]').add($field).each(function(i, el) {
				var $container = $(el);
				var selection = $container.attr('data-editor');
				
				if ( _.isUndefined(selection) ) return;
				
				if ( $container.attr('replace') === undefined ) {
					$container.append( options.submit.html );
				} else {
					$container.replaceWith( options.submit.html );
				}
			});
			
			// Store the rendered result
			this._submitView = $field;
		}
		
		this.constructor.__super__.initialize.call(this, form_options);
		
	},
	
	/**
	 * Add the rendered submit UI if present
	 */
	render: function () {
		this.constructor.__super__.render.call(this);
		
		var container = this.$el.find('[data-fieldsets]');
		if ( !container.length ) container = this.$el;
		container = container.children(':last-child');
		
		var fields = container.find('[data-fields]');
		if ( !fields.length ) fields = container;
		fields.append( this._submitView );
		
		return this;
	},
	
	/**
	 * Sets errors onto a set of fields and re-renders the changed fields.
	 *
	 * @param Hash of field_name => [error_messages] pairs.
	 */
	setErrors: function (errors) {
		_.each(errors, function (error, key) {
			if ( !this.fields[key] ) {
				throw new Error("Unknown field '" + key + "'");
			}
			
			var text = (error instanceof Array) ? error.join('<br/>') : error;
			this.fields[key].setSchemaAttr( 'errortext', text );
		}, this);
	},
	
	/**
	 * Get a Form spec from the SceForm spec
	 *
	 * @param {Object} @see options from initialize()
	 *
	 * @return spec in Form format
	 */
	mapSceSpecsToForm: function (options) {
		if ( !options || !options.specs ) {
			return {};
		}
		
		if ( options.specs.categories && options.specs.categories.content ) {
			options.specs = options.specs.categories.content;
		} else if ( options.specs.content ) {
			options.specs = options.specs.content;
		}
		
		if ( options.specs instanceof Array && options.specs.length < 1 ) {
			return {};
		}
		
		var result = {
			model: {},     // Passed into Backbone.Model constructor
			schema: {},    // In format expected by Form
			fieldsets: []  // In format expected by Form
		};
		
		this._parseCatContent( result, options, null, options.specs );
		
		result.model = new Backbone.Model(result.model);
		return result;
	},
	
	/**
	 * Parses a content block and calls the appropriate helper parser for
	 * the type of content. Currently supported block types are 'category'
	 * and 'fields'
	 *
	 * @param {Object} Reference to container for fieldset
	 * @param {Object} @see options from initialize()
	 * @param [Array]  Reference to container for fields
	 * @param {Object} Content definition in SceForm format
	 */
	_parseCatContent: function (result, options, parent, spec) {
		if ( !spec ) {
			return;
		}
		
		for ( var ii = 0; ii < spec.length; ii ++ ) {
			if ( spec[ii].fields ) {
				if ( parent == null ) {
					throw new Error( 'Top level fields not supported' );
				}
				var fields = [];
				parent.content[ parent.content.length ]
					= { type: 'fields', fields: fields };
				this._parseXmlNest(
					spec[ii].fields, 'field', this._parseField,
					[ fields, result, options ]
				);
			} else if ( spec[ii].category ) {
				this._parseXmlNest(
					spec[ii].category, null, this._parseFieldset,
					[ result, options, parent ]
				);
			}
		}
	},
	
	/**
	 * Wrapper helper that performs another parse function, but does not
	 * assume that the keys will be arrays. When length = 1, the key is not
	 * passed as an array so this function catches that condition.
	 *
	 * @param {Object}   The container of nodes to be checked
	 * @param {String}   The key within the container to check for an array
	 * @param {Function} Parser method to call on each node
	 * @param {Array}    Arguments to pass first to the parser method
	 */
	_parseXmlNest: function (nest, key, parser, args) {
		if ( !nest ) {
			return;
		}
		
		nest = (nest instanceof Array) ? nest : [ nest ];
		args = args || [];
		
		for ( var ii = 0; ii < nest.length; ii++ ) {
			if ( !key || !nest[ii][key] ) {
				parser.apply( this, args.concat([ nest[ii] ]) );
			} else {
				var inner_nest = nest[ii][key];
				inner_nest = (inner_nest instanceof Array) ? inner_nest : [ inner_nest ];
				for ( var jj = 0; jj < inner_nest.length; jj++ ) {
					parser.apply( this, args.concat([ inner_nest[jj] ]) );
				}
			}
		}
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
	_parseFieldset: function (result, options, parent, spec) {
		var fieldset = {
			type: 'fieldset',
			legend: spec.name,
			help:   spec.description,
			content: []
		};
		
		if ( parent ) {
			parent.content[ parent.content.length ] = fieldset;
		} else {
			result.fieldsets[ result.fieldsets.length ] = fieldset;
		}
		
		this._parseCatContent( result, options, fieldset, spec.content );
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
		if ( sce_field.dependent_elements ) {
			var fieldset = { content: [] };
			fields[ fields.length ] = fieldset.content;
			this._parseFieldset(result, options, fieldset, {
				name: '',
				content: [{ fields: { field: sce_field.dependent_elements.field } }]
			});
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
		
		this._parseXmlNest( sce_field.options, 'option', function(sce_opt) {
			options[ options.length ] = {
				  val: sce_opt.option_value,
				label: sce_opt.option_label
			};
		});
		
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
			sce_field, options, this.constructor.DEFAULTS
		);
		
		result.fieldTemplate =_.firstDefined(
			sce_field.template,
			options.fieldTemplate,
			this.constructor.Field.template
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
				return { type: 'Text' }; // TODO: Time
			case 'uint':
				return { type: 'Text' };
		}
		
		// Force each spec type to be explicitly mapped
		throw new Error(
			"Unknown spec.datatype: '" + sce_field.datatype + "'"
		);
	}
	
}, {

	// STATICS
	
	DEFAULTS: {
		addEmptySelectOption: false,
		useChosen: true,
		chosenOptions: { }
	}
	
});

  
//==================================================================================================
//VALIDATORS
//==================================================================================================

Form.validators = (function() {

  var validators = {};

  validators.errMessages = {
    required: 'Required',
    regexp: 'Invalid',
    email: 'Invalid email address',
    url: 'Invalid URL',
    match: _.template('Must match field "<%= field %>"', null, Form.templateSettings)
  };
  
  validators.required = function(options) {
    options = _.extend({
      type: 'required',
      message: this.errMessages.required
    }, options);
     
    return function required(value) {
      options.value = value;
      
      var err = {
        type: options.type,
        message: _.isFunction(options.message) ? options.message(options) : options.message
      };
      
      if (value === null || value === undefined || value === false || value === '') return err;
    };
  };
  
  validators.regexp = function(options) {
    if (!options.regexp) throw new Error('Missing required "regexp" option for "regexp" validator');
  
    options = _.extend({
      type: 'regexp',
      message: this.errMessages.regexp
    }, options);
    
    return function regexp(value) {
      options.value = value;
      
      var err = {
        type: options.type,
        message: _.isFunction(options.message) ? options.message(options) : options.message
      };
      
      //Don't check empty values (add a 'required' validator for this)
      if (value === null || value === undefined || value === '') return;

      if (!options.regexp.test(value)) return err;
    };
  };
  
  validators.email = function(options) {
    options = _.extend({
      type: 'email',
      message: this.errMessages.email,
      regexp: /^[\w\-]{1,}([\w\-\+.]{1,1}[\w\-]{1,}){0,}[@][\w\-]{1,}([.]([\w\-]{1,})){1,3}$/
    }, options);
    
    return validators.regexp(options);
  };
  
  validators.url = function(options) {
    options = _.extend({
      type: 'url',
      message: this.errMessages.url,
      regexp: /^(http|https):\/\/(([A-Z0-9][A-Z0-9_\-]*)(\.[A-Z0-9][A-Z0-9_\-]*)+)(:(\d+))?\/?/i
    }, options);
    
    return validators.regexp(options);
  };
  
  validators.match = function(options) {
    if (!options.field) throw new Error('Missing required "field" options for "match" validator');
    
    options = _.extend({
      type: 'match',
      message: this.errMessages.match
    }, options);
    
    return function match(value, attrs) {
      options.value = value;
      
      var err = {
        type: options.type,
        message: _.isFunction(options.message) ? options.message(options) : options.message
      };
      
      //Don't check empty values (add a 'required' validator for this)
      if (value === null || value === undefined || value === '') return;
      
      if (value !== attrs[options.field]) return err;
    };
  };


  return validators;

})();


//==================================================================================================
//FIELDSET
//==================================================================================================

Form.Fieldset = Backbone.View.extend({

	/**
	 * Constructor
	 *
	 * Valid fieldset schemas:
	 *   ['field1', 'field2']
	 *   { legend: 'Some Fieldset', fields: ['field1', 'field2'] }
	 *
	 * @param {String[]|Object[]} options.schema      Fieldset schema
	 * @param {Object} options.fields           Form fields
	 */
	initialize: function(options) {
		var self = this;
		
		options = options || {};

		//Create the full fieldset schema, merging defaults etc.
		var schema = this.schema = this.createSchema(options.schema);

		//Store the fields for this fieldset
		this.fields = _.pick(options.fields, schema.fields);
		
		this.dependencyClass = options.dependencyClass;
		this.cssClass = options.cssClass || '';

		this.content = [];
		var content = options.schema.content;
		
		// Store nested fieldsets
		if ( content ) {
			_.each(content, function (item) {
				if ( item.type == 'fields' ) {
					self._registerFields( item.fields, options.fields );
				}
				else if ( item.type == 'fieldset' ) {
					self.content[ self.content.length ] = new Form.Fieldset({
						dependencyClass: self.dependencyClass,
						schema: item,
						fields: options.fields
					});
				}
			});
		}

		//Override defaults
		this.template = options.template || this.constructor.template;
	},
	
	_registerFields: function (fields, fields_ref) {
		_.each(fields, function (field) {
			if ( field instanceof Array ) {
				this._registerDependants( field, fields_ref );
			} else {
				this.content[ this.content.length ] = fields_ref[ field ];
			}
		}, this);
	},
	
	_registerDependants: function (fieldsets, fields_ref) {
		var dependants = this.content[ this.content.length - 1 ].dependants;
		
		_.each(fieldsets, function (fieldset) {
			dependants[ dependants.length ] = new Form.Fieldset({
				dependencyClass: this.dependencyClass,
				cssClass: this.dependencyClass,
				schema: fieldset,
				fields: fields_ref
			});
		}, this);
	},

	/**
	* Creates the full fieldset schema, normalising, merging defaults etc.
	*
	* @param {String[]|Object[]} schema
	*
	* @return {Object}
	*/
	createSchema: function(schema) {
		//Normalise to object
		if (_.isArray(schema)) {
			schema = { fields: schema };
		}

		//Add null legend to prevent template error
		schema.legend = schema.legend || null;

		return schema;
	},

	/**
	 * Returns the field for a given index
	 *
	 * @param {Number} index
	 *
	 * @return {Field}
	 */
	getFieldAt: function(index) {
		var key = this.schema.fields[index];

		return this.fields[key];
	},

	/**
	* Returns data to pass to template
	*
	* @return {Object}
	*/
	templateData: function() {
		return this.schema;
	},

	/**
	 * Renders the fieldset and fields
	 *
	 * @return {Fieldset} this
	 */
	render: function() {
		var schema  = this.schema;
		var fields  = this.fields;
		var content = this.content;

		//Render fieldset
		var $fieldset = $($.trim(this.template(_.result(this, 'templateData'))));
		
		$fieldset.addClass( this.cssClass );

		//Render fields
		$fieldset.find('[data-fields]').add($fieldset).each(function(i, el) {
			var $container = $(el),
			selection = $container.attr('data-fields');

			if (_.isUndefined(selection)) return;

			_.each(fields, function(field) {
				$container.append(field.render().el);
			});
			
			var group_broken = false;
			var last = $container;
			
			// Render nested fieldsets and fields
			_.each(content, function(item) {
				var $el = item.render().$el;
				
				if ( item.fields ) {
					$el.insertAfter( last );
					last = $el;
					group_broken = true;
				} else {
					if ( group_broken ) {
						var newbox = $($container[0].cloneNode());
						newbox.insertAfter(last);
						last = $container = newbox;
						group_broken = false;
					}
					$container.append( $el );
				}
			});
		});

		this.setElement($fieldset);

		return this;
	},

	/**
	 * Remove embedded views then self
	 */
	remove: function() {
		_.each(this.fields, function(field) {
			field.remove();
		});

		Backbone.View.prototype.remove.call(this);
	}
  
}, {
  //STATICS

	template: _.template('\
		<fieldset>\
			<% if (legend) { %>\
				<legend><%= legend %></legend>\
			<% } %>\
			<ol data-fields></ol> \
		</fieldset>\
	', null, Form.templateSettings)

});


//==================================================================================================
//FIELD
//==================================================================================================

Form.Field = Backbone.View.extend({

	/**
	 * Constructor
	 * 
	 * @param {Object} options.key
	 * @param {Object} options.form
	 * @param {Object} [options.schema]
	 * @param {Function} [options.schema.template]
	 * @param {Backbone.Model} [options.model]
	 * @param {Object} [options.value]
	 * @param {String} [options.idPrefix]
	 * @param {Function} [options.template]
	 * @param {Function} [options.errorClassName]
	 */
	initialize: function(options) {
		options = options || {};

		//Store important data
		_.extend(this, _.pick(options, 'form', 'key', 'model', 'value', 'idPrefix'));

		//Create the full field schema, merging defaults etc.
		var schema = this.schema = this.createSchema(options.schema);

		//Override defaults
		this.template = options.template || schema.template || this.constructor.template;
		this.errorClassName = options.errorClassName || this.constructor.errorClassName;
		this.dependants = [];

		//Create editor
		this.editor = this.createEditor();
		var self = this;
		this.editor.on('change', function() {
			var value = this.getValue();
			_.each(self.dependants, function (fieldset) {
				fieldset.$el.toggleClass('active', value);
			});
		});
	},

	/**
	* Creates the full field schema, merging defaults etc.
	*
	* @param {Object|String} schema
	*
	* @return {Object}
	*/
	createSchema: function(schema) {
		if (_.isString(schema)) schema = { type: schema };

		//Set defaults
		schema = _.extend({
			type: 'Text',
			title: this.createTitle()
		}, schema);

		if ( !schema.schemaAttrs ) schema.schemaAttrs = {};

		this.typeName = schema.type;
		//Get the real constructor function i.e. if type is a string such as 'Text'
		schema.type = (_.isString(schema.type)) ? Form.editors[schema.type] : schema.type;

		return schema;
	},

	/**
	* Creates the editor specified in the schema; either an editor string name or
	* a constructor function
	*
	* @return {View}
	*/
	createEditor: function() {
		var options = _.extend(
			_.pick(this, 'schema', 'form', 'key', 'model', 'value'),
			{
				id: this.createEditorId(),
				chosenOptions: this.schema.schemaAttrs.chosenOptions,
				placeholder: this.schema.schemaAttrs.placeholder
			}
		);

		var constructorFn = this.schema.type;

		return new constructorFn(options);
	},

	/**
	 * Creates the ID that will be assigned to the editor
	 *
	 * @return {String}
	 */
	createEditorId: function() {
		var prefix = this.idPrefix,
		id = this.key;

		//Replace periods with underscores (e.g. for when using paths)
		id = id.replace(/\./g, '_');

		//If a specific ID prefix is set, use it
		if (_.isString(prefix) || _.isNumber(prefix)) return prefix + id;
		if (_.isNull(prefix)) return id;

		//Otherwise, if there is a model use it's CID to avoid conflicts when multiple forms are on the page
		if (this.model) return this.model.cid + '_' + id;

		return id;
	},

	/**
	 * Create the default field title (label text) from the key name.
	 * (Converts 'camelCase' to 'Camel Case')
	 *
	 * @return {String}
	 */
	createTitle: function() {
		var str = this.key;

		//Add spaces
		str = str.replace(/([A-Z])/g, ' $1');

		//Uppercase first character
		str = str.replace(/^./, function(str) { return str.toUpperCase(); });

		return str;
	},

	/**
	 * Returns the data to be passed to the template
	 *
	 * @return {Object}
	 */
	templateData: function() {
		var schema = this.schema;

		return {
			help: schema.help || '',
			title: schema.title,
			fieldAttrs: schema.fieldAttrs,
			editorAttrs: schema.editorAttrs,
			schemaAttrs: schema.schemaAttrs,
			key: this.key,
			editorId: this.editor.id,
			editorType: this.typeName
		};
	},

	/**
	 * Render the field and editor
	 *
	 * @return {Field} self
	 */
	render: function() {
		var schema = this.schema,
		editor = this.editor;

		//Render field
		var $field = $($.trim(this.template(_.result(this, 'templateData'))));

		if (schema.fieldClass) $field.addClass(schema.fieldClass);
		if (schema.fieldAttrs) $field.attr(schema.fieldAttrs);

		//Render editor
		$field.find('[data-editor]').add($field).each(function(i, el) {
			var $container = $(el),
			selection = $container.attr('data-editor');

			if (_.isUndefined(selection)) return;

			if ( $container.attr('replace') === undefined ) {
				$container.append(editor.render().el);
			} else {
				$container.replaceWith( editor.render().el );
			}
		});

		_.each(this.dependants, function(fieldset) {
			$field.append( fieldset.render().el );
		});
		
		this.$el.remove();
		this.setElement($field);

		return this;
	},
	
	/**
	 * Change a SchemaAttr setting and update the display
	 *
	 * @param Attribute key
	 * @param New value
	 */
	setSchemaAttr: function (attribute, value) {
		this.schema.schemaAttrs[attribute] = value;
		
		// Re-render
		var next = this.$el.next();
		var parent = this.$el.parent();
		this.$el.remove();
		
		if ( next.length < 1 ) {
			parent.append( this.render().$el );
		} else {
			this.render().$el.insertBefore( next );
		}
	},

	/**
	* Check the validity of the field
	*
	* @return {String}
	*/
	validate: function() {
		var error = this.editor.validate();

		if (error) {
			this.setError(error.message);
		} else {
			this.clearError();
		}

		return error;
	},

	/**
	* Set the field into an error state, adding the error class and setting the error message
	*
	* @param {String} msg     Error message
	*/
	setError: function(msg) {
		//Nested form editors (e.g. Object) set their errors internally
		if (this.editor.hasNestedForm) return;

		//Add error CSS class
		this.$el.addClass(this.errorClassName);

		//Set error message
		this.$('[data-error]').html(msg);
	},

	/**
	* Clear the error state and reset the help message
	*/
	clearError: function() {
		//Remove error CSS class
		this.$el.removeClass(this.errorClassName);

		//Clear error message
		this.$('[data-error]').empty();
	},

	/**
	* Update the model with the new value from the editor
	*
	* @return {Mixed}
	*/
	commit: function() {
		return this.editor.commit();
	},

	/**
	* Get the value from the editor
	*
	* @return {Mixed}
	*/
	getValue: function() {
		return this.editor.getValue();
	},

	/**
	* Set/change the value of the editor
	*
	* @param {Mixed} value
	*/
	setValue: function(value) {
		this.editor.setValue(value);
	},

	/**
	* Give the editor focus
	*/
	focus: function() {
		this.editor.focus();
	},

	/**
	* Remove focus from the editor
	*/
	blur: function() {
		this.editor.blur();
	},

	/**
	* Remove the field and editor views
	*/
	remove: function() {
		this.editor.remove();

		Backbone.View.prototype.remove.call(this);
	}

}, {
  //STATICS

  template: _.template('\
    <div>\
      <label for="<%= editorId %>"><%= title %></label>\
      <div>\
        <span data-editor></span>\
        <div data-error></div>\
        <div><%= help %></div>\
      </div>\
    </div>\
  ', null, Form.templateSettings),

  /**
   * CSS class name added to the field when there is a validation error
   */
  errorClassName: 'error'

});


//==================================================================================================
//NESTEDFIELD
//==================================================================================================

Form.NestedField = Form.Field.extend({

  template: _.template($.trim('\
    <div>\
      <span data-editor></span>\
      <% if (help) { %>\
        <div><%= help %></div>\
      <% } %>\
      <div data-error></div>\
    </div>\
  '), null, Form.templateSettings)

});

/**
 * Base editor (interface). To be extended, not used directly
 *
 * @param {Object} options
 * @param {String} [options.id]         Editor ID
 * @param {Model} [options.model]       Use instead of value, and use commit()
 * @param {String} [options.key]        The model attribute key. Required when using 'model'
 * @param {Mixed} [options.value]       When not using a model. If neither provided, defaultValue will be used
 * @param {Object} [options.schema]     Field schema; may be required by some editors
 * @param {Object} [options.validators] Validators; falls back to those stored on schema
 * @param {Object} [options.form]       The form
 */
Form.Editor = Form.editors.Base = Backbone.View.extend({

  defaultValue: null,

  hasFocus: false,

  initialize: function(options) {
    var options = options || {};

    //Set initial value
    if (options.model) {
      if (!options.key) throw "Missing option: 'key'";

      this.model = options.model;

      this.value = this.model.get(options.key);
    }
    else if (options.value) {
      this.value = options.value;
    }

    if (this.value === undefined) this.value = this.defaultValue;

    //Store important data
    _.extend(this, _.pick(options, 'key', 'form'));

    var schema = this.schema = options.schema || {};

    this.validators = options.validators || schema.validators;

    //Main attributes
    this.$el.attr('id', this.id);
    this.$el.attr('name', this.getName());
    if (schema.editorClass) this.$el.addClass(schema.editorClass);
    if (schema.editorAttrs) this.$el.attr(schema.editorAttrs);
  },

  /**
   * Get the value for the form input 'name' attribute
   *
   * @return {String}
   *
   * @api private
   */
  getName: function() {
    var key = this.key || '';

    //Replace periods with underscores (e.g. for when using paths)
    return key.replace(/\./g, '_');
  },

  /**
   * Get editor value
   * Extend and override this method to reflect changes in the DOM
   *
   * @return {Mixed}
   */
  getValue: function() {
    return this.value;
  },

  /**
   * Set editor value
   * Extend and override this method to reflect changes in the DOM
   *
   * @param {Mixed} value
   */
  setValue: function(value) {
    this.value = value;
  },

  /**
   * Give the editor focus
   * Extend and override this method
   */
  focus: function() {
    throw 'Not implemented';
  },
  
  /**
   * Remove focus from the editor
   * Extend and override this method
   */
  blur: function() {
    throw 'Not implemented';
  },

  /**
   * Update the model with the current value
   *
   * @param {Object} [options]              Options to pass to model.set()
   * @param {Boolean} [options.validate]    Set to true to trigger built-in model validation
   *
   * @return {Mixed} error
   */
  commit: function(options) {
    var error = this.validate();
    if (error) return error;

    this.listenTo(this.model, 'invalid', function(model, e) {
      error = e;
    });
    this.model.set(this.key, this.getValue(), options);

    if (error) return error;
  },

  /**
   * Check validity
   *
   * @return {Object|Undefined}
   */
  validate: function() {
    var $el = this.$el,
        error = null,
        value = this.getValue(),
        formValues = this.form ? this.form.getValue() : {},
        validators = this.validators,
        getValidator = this.getValidator;

    if (validators) {
      //Run through validators until an error is found
      _.every(validators, function(validator) {
        error = getValidator(validator)(value, formValues);

        return error ? false : true;
      });
    }

    return error;
  },

  /**
   * Set this.hasFocus, or call parent trigger()
   *
   * @param {String} event
   */
  trigger: function(event) {
    if (event === 'focus') {
      this.hasFocus = true;
    }
    else if (event === 'blur') {
      this.hasFocus = false;
    }

    return Backbone.View.prototype.trigger.apply(this, arguments);
  },

  /**
   * Returns a validation function based on the type defined in the schema
   *
   * @param {RegExp|String|Function} validator
   * @return {Function}
   */
  getValidator: function(validator) {
    var validators = Form.validators;

    //Convert regular expressions to validators
    if (_.isRegExp(validator)) {
      return validators.regexp({ regexp: validator });
    }
    
    //Use a built-in validator if given a string
    if (_.isString(validator)) {
      if (!validators[validator]) throw new Error('Validator "'+validator+'" not found');
      
      return validators[validator]();
    }

    //Functions can be used directly
    if (_.isFunction(validator)) return validator;

    //Use a customised built-in validator if given an object
    if (_.isObject(validator) && validator.type) {
      var config = validator;
      
      return validators[config.type](config);
    }
    
    //Unkown validator type
    throw new Error('Invalid validator: ' + validator);
  }
});

/**
 * Text
 * 
 * Text input with focus, blur and change events
 */
Form.editors.Text = Form.Editor.extend({

  tagName: 'input',

  defaultValue: '',

  previousValue: '',

  events: {
    'keyup':    'determineChange',
    'keypress': function(event) {
      var self = this;
      setTimeout(function() {
        self.determineChange();
      }, 0);
    },
    'select':   function(event) {
      this.trigger('select', this);
    },
    'focus':    function(event) {
      this.trigger('focus', this);
    },
    'blur':     function(event) {
      this.trigger('blur', this);
    }
  },

  initialize: function(options) {
    Form.editors.Base.prototype.initialize.call(this, options);

    var schema = this.schema;

    //Allow customising text type (email, phone etc.) for HTML5 browsers
    var type = 'text';

    if (schema && schema.editorAttrs && schema.editorAttrs.type) type = schema.editorAttrs.type;
    if (schema && schema.dataType) type = schema.dataType;

    this.$el.attr('type', type);
  },

  /**
   * Adds the editor to the DOM
   */
  render: function() {
    this.setValue(this.value);

    return this;
  },

  determineChange: function(event) {
    var currentValue = this.$el.val();
    var changed = (currentValue !== this.previousValue);

    if (changed) {
      this.previousValue = currentValue;

      this.trigger('change', this);
    }
  },

  /**
   * Returns the current editor value
   * @return {String}
   */
  getValue: function() {
    return this.$el.val();
  },

  /**
   * Sets the value of the form element
   * @param {String}
   */
  setValue: function(value) {
    this.$el.val(value);
  },

  focus: function() {
    if (this.hasFocus) return;

    this.$el.focus();
  },

  blur: function() {
    if (!this.hasFocus) return;

    this.$el.blur();
  },

  select: function() {
    this.$el.select();
  }

});

/**
 * TextArea editor
 */
Form.editors.TextArea = Form.editors.Text.extend({

  tagName: 'textarea'

});

/**
 * Password editor
 */
Form.editors.Password = Form.editors.Text.extend({

  initialize: function(options) {
    Form.editors.Text.prototype.initialize.call(this, options);

    this.$el.attr('type', 'password');
  }

});

/**
 * NUMBER
 * 
 * Normal text input that only allows a number. Letters etc. are not entered.
 */
Form.editors.Number = Form.editors.Text.extend({

  defaultValue: 0,

  events: _.extend({}, Form.editors.Text.prototype.events, {
    'keypress': 'onKeyPress'
  }),

  initialize: function(options) {
    Form.editors.Text.prototype.initialize.call(this, options);

    this.$el.attr('type', 'number');
    this.$el.attr('step', 'any');
  },

  /**
   * Check value is numeric
   */
  onKeyPress: function(event) {
    var self = this,
        delayedDetermineChange = function() {
          setTimeout(function() {
            self.determineChange();
          }, 0);
        };

    //Allow backspace
    if (event.charCode === 0) {
      delayedDetermineChange();
      return;
    }

    //Get the whole new value so that we can prevent things like double decimals points etc.
    var newVal = this.$el.val() + String.fromCharCode(event.charCode);

    var numeric = /^[0-9]*\.?[0-9]*?$/.test(newVal);

    if (numeric) {
      delayedDetermineChange();
    }
    else {
      event.preventDefault();
    }
  },

  getValue: function() {
    var value = this.$el.val();

    return value === "" ? null : parseFloat(value, 10);
  },

  setValue: function(value) {
    value = (function() {
      if (_.isNumber(value)) return value;

      if (_.isString(value) && value !== '') return parseFloat(value, 10);

      return null;
    })();

    if (_.isNaN(value)) value = null;

    Form.editors.Text.prototype.setValue.call(this, value);
  }

});

/**
 * Hidden editor
 */
Form.editors.Hidden = Form.editors.Base.extend({

  defaultValue: '',

  initialize: function(options) {
    Form.editors.Text.prototype.initialize.call(this, options);

    this.$el.attr('type', 'hidden');
  },

  focus: function() {

  },

  blur: function() {

  }

});

/**
 * Checkbox editor
 *
 * Creates a single checkbox, i.e. boolean value
 */
Form.editors.Checkbox = Form.editors.Base.extend({

  defaultValue: false,

  tagName: 'input',

  events: {
    'click':  function(event) {
      this.trigger('change', this);
    },
    'focus':  function(event) {
      this.trigger('focus', this);
    },
    'blur':   function(event) {
      this.trigger('blur', this);
    }
  },

  initialize: function(options) {
    Form.editors.Base.prototype.initialize.call(this, options);

    this.$el.attr('type', 'checkbox');
  },

  /**
   * Adds the editor to the DOM
   */
  render: function() {
    this.setValue(this.value);

    return this;
  },

  getValue: function() {
    return this.$el.prop('checked');
  },

  setValue: function(value) {
    if (value) {
      this.$el.prop('checked', true);
    }
  },

  focus: function() {
    if (this.hasFocus) return;

    this.$el.focus();
  },

  blur: function() {
    if (!this.hasFocus) return;

    this.$el.blur();
  }

});

/**
 * Select editor
 *
 * Renders a <select> with given options
 *
 * Requires an 'options' value on the schema.
 *  Can be an array of options, a function that calls back with the array of options, a string of HTML
 *  or a Backbone collection. If a collection, the models must implement a toString() method
 */
Form.editors.Select = Form.editors.Base.extend({

  tagName: 'select',

  events: {
    'change': function(event) {
      this.trigger('change', this);
    },
    'focus':  function(event) {
      this.trigger('focus', this);
    },
    'blur':   function(event) {
      this.trigger('blur', this);
    }
  },

  initialize: function(options) {
    Form.editors.Base.prototype.initialize.call(this, options);

    if (!this.schema || !this.schema.options) throw "Missing required 'schema.options'";
  },

  render: function() {
    this.setOptions(this.schema.options);

    return this;
  },

  /**
   * Sets the options that populate the <select>
   *
   * @param {Mixed} options
   */
  setOptions: function(options) {
    var self = this;

    //If a collection was passed, check if it needs fetching
    if (options instanceof Backbone.Collection) {
      var collection = options;

      //Don't do the fetch if it's already populated
      if (collection.length > 0) {
        this.renderOptions(options);
      } else {
        collection.fetch({
          success: function(collection) {
            self.renderOptions(options);
          }
        });
      }
    }

    //If a function was passed, run it to get the options
    else if (_.isFunction(options)) {
      options(function(result) {
        self.renderOptions(result);
      }, self);
    }

    //Otherwise, ready to go straight to renderOptions
    else {
      this.renderOptions(options);
    }
  },

  /**
   * Adds the <option> html to the DOM
   * @param {Mixed}   Options as a simple array e.g. ['option1', 'option2']
   *                      or as an array of objects e.g. [{val: 543, label: 'Title for object 543'}]
   *                      or as a string of <option> HTML to insert into the <select>
   */
  renderOptions: function(options) {
    var $select = this.$el,
        html;

    html = this._getOptionsHtml(options);

    //Insert options
    $select.html(html);

    //Select correct option
    this.setValue(this.value);
  },

  _getOptionsHtml: function(options) {
    var html;
    //Accept string of HTML
    if (_.isString(options)) {
      html = options;
    }

    //Or array
    else if (_.isArray(options)) {
      html = this._arrayToHtml(options);
    }

    //Or Backbone collection
    else if (options instanceof Backbone.Collection) {
      html = this._collectionToHtml(options);
    }

    else if (_.isFunction(options)) {
      var newOptions;
      
      options(function(opts) {
        newOptions = opts;
      }, this);
      
      html = this._getOptionsHtml(newOptions);
    }

    return html;
  },

  getValue: function() {
    return this.$el.val();
  },

  setValue: function(value) {
    this.$el.val(value);
  },

  focus: function() {
    if (this.hasFocus) return;

    this.$el.focus();
  },

  blur: function() {
    if (!this.hasFocus) return;

    this.$el.blur();
  },

  /**
   * Transforms a collection into HTML ready to use in the renderOptions method
   * @param {Backbone.Collection}
   * @return {String}
   */
  _collectionToHtml: function(collection) {
    //Convert collection to array first
    var array = [];
    collection.each(function(model) {
      array.push({ val: model.id, label: model.toString() });
    });

    //Now convert to HTML
    var html = this._arrayToHtml(array);

    return html;
  },

  /**
   * Create the <option> HTML
   * @param {Array}   Options as a simple array e.g. ['option1', 'option2']
   *                      or as an array of objects e.g. [{val: 543, label: 'Title for object 543'}]
   * @return {String} HTML
   */
  _arrayToHtml: function(array) {
    var html = [];

    //Generate HTML
    _.each(array, function(option) {
      if (_.isObject(option)) {
        if (option.group) {
          html.push('<optgroup label="'+option.group+'">');
          html.push(this._getOptionsHtml(option.options))
          html.push('</optgroup>');
        } else {
          var val = (option.val || option.val === 0) ? option.val : '';
          html.push('<option value="'+val+'">'+option.label+'</option>');
        }
      }
      else {
        html.push('<option>'+option+'</option>');
      }
    }, this);

    return html.join('');
  }

});

/**
 * Chosen editor
 *
 * Renders a Chosen.js selector with given options
 *
 * Requires an 'options' value on the schema.
 */
Form.editors.Chosen = Form.editors.Select.extend({

	chosenOptions: null,
	
	initialize: function (options) {
		Form.editors.Select.prototype.initialize.call(this, options);
		
		if ( !this.$el.chosen ) {
			throw new Error('Chosen plugin not detected!');
		}
		
		this.chosenOptions = options.chosenOptions;
	},
	
	focus: function() {
		if (this.hasFocus) return;
		
		// Chosen hides the initial select element to which $el points, and
		// hidden elements do not support focus/blur behavior. Thus, we need
		// to only execute the handlers. Chosen does not implement blur/focus
		// handles?
		this.$el.triggerHandler('focus');
	},
	
	blur: function() {
		if (!this.hasFocus) return;
		
		// See comment in focus()
		this.$el.triggerHandler('blur');
	},
	
	render: function() {
		Form.editors.Chosen.__super__.render.call(this);
		
		// TODO: Should not use schemaAttrs for this check
		var attrs = this.schema.schemaAttrs;
		if ( attrs && attrs.datatype == 'multi_select' ) {
			this.el.multiple = 'multiple';
		}
		
		return this;
	},
	
	initDisplay: function() {
		this.$el.chosen( this.chosenOptions );
	},
	
	remove: function() {
		// Kill the chosen stuff
		this.$el.next().remove();
		Form.editors.Chosen.__super__.remove.call(this);
	}
	
});
/**
 * Radio editor
 *
 * Renders a <ul> with given options represented as <li> objects containing radio buttons
 *
 * Requires an 'options' value on the schema.
 *  Can be an array of options, a function that calls back with the array of options, a string of HTML
 *  or a Backbone collection. If a collection, the models must implement a toString() method
 */
Form.editors.Radio = Form.editors.Select.extend({

  tagName: 'ul',

  events: {
    'change input[type=radio]': function() {
      this.trigger('change', this);
    },
    'focus input[type=radio]': function() {
      if (this.hasFocus) return;
      this.trigger('focus', this);
    },
    'blur input[type=radio]': function() {
      if (!this.hasFocus) return;
      var self = this;
      setTimeout(function() {
        if (self.$('input[type=radio]:focus')[0]) return;
        self.trigger('blur', self);
      }, 0);
    }
  },

  getValue: function() {
    return this.$('input[type=radio]:checked').val();
  },

  setValue: function(value) {
    this.$('input[type=radio]').val([value]);
  },

  focus: function() {
    if (this.hasFocus) return;

    var checked = this.$('input[type=radio]:checked');
    if (checked[0]) {
      checked.focus();
      return;
    }

    this.$('input[type=radio]').first().focus();
  },

  blur: function() {
    if (!this.hasFocus) return;

    this.$('input[type=radio]:focus').blur();
  },

  /**
   * Create the radio list HTML
   * @param {Array}   Options as a simple array e.g. ['option1', 'option2']
   *                      or as an array of objects e.g. [{val: 543, label: 'Title for object 543'}]
   * @return {String} HTML
   */
  _arrayToHtml: function (array) {
    var html = [];
    var self = this;

    _.each(array, function(option, index) {
      var itemHtml = '<li>';
      if (_.isObject(option)) {
        var val = (option.val || option.val === 0) ? option.val : '';
        itemHtml += ('<input type="radio" name="'+self.getName()+'" value="'+val+'" id="'+self.id+'-'+index+'" />');
        itemHtml += ('<label for="'+self.id+'-'+index+'">'+option.label+'</label>');
      }
      else {
        itemHtml += ('<input type="radio" name="'+self.getName()+'" value="'+option+'" id="'+self.id+'-'+index+'" />');
        itemHtml += ('<label for="'+self.id+'-'+index+'">'+option+'</label>');
      }
      itemHtml += '</li>';
      html.push(itemHtml);
    });

    return html.join('');
  }

});

/**
 * Checkboxes editor
 *
 * Renders a <ul> with given options represented as <li> objects containing checkboxes
 *
 * Requires an 'options' value on the schema.
 *  Can be an array of options, a function that calls back with the array of options, a string of HTML
 *  or a Backbone collection. If a collection, the models must implement a toString() method
 */
Form.editors.Checkboxes = Form.editors.Select.extend({

  tagName: 'div',
	className: 'checkboxes',

  events: {
    'click input[type=checkbox]': function() {
      this.trigger('change', this);
    },
    'focus input[type=checkbox]': function() {
      if (this.hasFocus) return;
      this.trigger('focus', this);
    },
    'blur input[type=checkbox]':  function() {
      if (!this.hasFocus) return;
      var self = this;
      setTimeout(function() {
        if (self.$('input[type=checkbox]:focus')[0]) return;
        self.trigger('blur', self);
      }, 0);
    }
  },

  getValue: function() {
    var values = [];
    this.$('input[type=checkbox]:checked').each(function() {
      values.push($(this).val());
    });
    return values;
  },

  setValue: function(values) {
    if (!_.isArray(values)) values = [values];
    this.$('input[type=checkbox]').val(values);
  },

  focus: function() {
    if (this.hasFocus) return;

    this.$('input[type=checkbox]').first().focus();
  },

  blur: function() {
    if (!this.hasFocus) return;

    this.$('input[type=checkbox]:focus').blur();
  },

  /**
   * Create the checkbox list HTML
   * @param {Array}   Options as a simple array e.g. ['option1', 'option2']
   *                      or as an array of objects e.g. [{val: 543, label: 'Title for object 543'}]
   * @return {String} HTML
   */
  _arrayToHtml: function (array) {
    var html = [];
    var self = this;

    _.each(array, function(option, index) {
      var itemHtml = '';
      if (_.isObject(option)) {
        var val = (option.val || option.val === 0) ? option.val : '';
        itemHtml += ('<input type="checkbox" name="'+self.getName()+'" value="'+val+'" id="'+self.id+'-'+index+'" />');
        itemHtml += ('<label for="'+self.id+'-'+index+'">'+option.label+'</label>');
      }
      else {
        itemHtml += ('<input type="checkbox" name="'+self.getName()+'" value="'+option+'" id="'+self.id+'-'+index+'" />');
        itemHtml += ('<label for="'+self.id+'-'+index+'">'+option+'</label>');
      }
      itemHtml += '';
      html.push(itemHtml);
    });

    return html.join('');
  }

});

/**
 * Object editor
 *
 * Creates a child form. For editing Javascript objects
 *
 * @param {Object} options
 * @param {Form} options.form                 The form this editor belongs to; used to determine the constructor for the nested form
 * @param {Object} options.schema             The schema for the object
 * @param {Object} options.schema.subSchema   The schema for the nested form
 */
Form.editors.Object = Form.editors.Base.extend({
  //Prevent error classes being set on the main control; they are internally on the individual fields
  hasNestedForm: true,

  initialize: function(options) {
    //Set default value for the instance so it's not a shared object
    this.value = {};

    //Init
    Form.editors.Base.prototype.initialize.call(this, options);

    //Check required options
    if (!this.form) throw 'Missing required option "form"';
    if (!this.schema.subSchema) throw new Error("Missing required 'schema.subSchema' option for Object editor");
  },

  render: function() {
    //Get the constructor for creating the nested form; i.e. the same constructor as used by the parent form
    var NestedForm = this.form.constructor;

    //Create the nested form
    this.nestedForm = new NestedForm({
      schema: this.schema.subSchema,
      data: this.value,
      idPrefix: this.id + '_',
      Field: NestedForm.NestedField
    });

    this._observeFormEvents();

    this.$el.html(this.nestedForm.render().el);

    if (this.hasFocus) this.trigger('blur', this);

    return this;
  },

  getValue: function() {
    if (this.nestedForm) return this.nestedForm.getValue();

    return this.value;
  },

  setValue: function(value) {
    this.value = value;

    this.render();
  },

  focus: function() {
    if (this.hasFocus) return;

    this.nestedForm.focus();
  },

  blur: function() {
    if (!this.hasFocus) return;

    this.nestedForm.blur();
  },

  remove: function() {
    this.nestedForm.remove();

    Backbone.View.prototype.remove.call(this);
  },

  validate: function() {
    return this.nestedForm.validate();
  },

  _observeFormEvents: function() {
    if (!this.nestedForm) return;
    
    this.nestedForm.on('all', function() {
      // args = ["key:change", form, fieldEditor]
      var args = _.toArray(arguments);
      args[1] = this;
      // args = ["key:change", this=objectEditor, fieldEditor]

      this.trigger.apply(this, args);
    }, this);
  }

});

/**
 * NestedModel editor
 *
 * Creates a child form. For editing nested Backbone models
 *
 * Special options:
 *   schema.model:   Embedded model constructor
 */
Form.editors.NestedModel = Form.editors.Object.extend({
  initialize: function(options) {
    Form.editors.Base.prototype.initialize.call(this, options);

    if (!this.form) throw 'Missing required option "form"';
    if (!options.schema.model) throw 'Missing required "schema.model" option for NestedModel editor';
  },

  render: function() {
    //Get the constructor for creating the nested form; i.e. the same constructor as used by the parent form
    var NestedForm = this.form.constructor;

    var data = this.value || {},
        key = this.key,
        nestedModel = this.schema.model;

    //Wrap the data in a model if it isn't already a model instance
    var modelInstance = (data.constructor === nestedModel) ? data : new nestedModel(data);

    this.nestedForm = new NestedForm({
      model: modelInstance,
      idPrefix: this.id + '_',
      fieldTemplate: 'nestedField'
    });

    this._observeFormEvents();

    //Render form
    this.$el.html(this.nestedForm.render().el);

    if (this.hasFocus) this.trigger('blur', this);

    return this;
  },

  /**
   * Update the embedded model, checking for nested validation errors and pass them up
   * Then update the main model if all OK
   *
   * @return {Error|null} Validation error or null
   */
  commit: function() {
    var error = this.nestedForm.commit();
    if (error) {
      this.$el.addClass('error');
      return error;
    }

    return Form.editors.Object.prototype.commit.call(this);
  }

});

/**
 * Date editor
 *
 * Schema options
 * @param {Number|String} [options.schema.yearStart]  First year in list. Default: 100 years ago
 * @param {Number|String} [options.schema.yearEnd]    Last year in list. Default: current year
 *
 * Config options (if not set, defaults to options stored on the main Date class)
 * @param {Boolean} [options.showMonthNames]  Use month names instead of numbers. Default: true
 * @param {String[]} [options.monthNames]     Month names. Default: Full English names
 */
Form.editors.Date = Form.editors.Base.extend({

  events: {
    'change select':  function() {
      this.updateHidden();
      this.trigger('change', this);
    },
    'focus select':   function() {
      if (this.hasFocus) return;
      this.trigger('focus', this);
    },
    'blur select':    function() {
      if (!this.hasFocus) return;
      var self = this;
      setTimeout(function() {
        if (self.$('select:focus')[0]) return;
        self.trigger('blur', self);
      }, 0);
    }
  },

  initialize: function(options) {
    options = options || {};

    Form.editors.Base.prototype.initialize.call(this, options);

    var Self = Form.editors.Date,
        today = new Date();

    //Option defaults
    this.options = _.extend({
      monthNames: Self.monthNames,
      showMonthNames: Self.showMonthNames
    }, options);

    //Schema defaults
    this.schema = _.extend({
      yearStart: today.getFullYear() - 100,
      yearEnd: today.getFullYear()
    }, options.schema || {});

    //Cast to Date
    if (this.value && !_.isDate(this.value)) {
      this.value = new Date(this.value);
    }

    //Set default date
    if (!this.value) {
      var date = new Date();
      date.setSeconds(0);
      date.setMilliseconds(0);

      this.value = date;
    }

    //Template
    this.template = options.template || this.constructor.template;
  },

  render: function() {
    var options = this.options,
        schema = this.schema;

    var datesOptions = _.map(_.range(1, 32), function(date) {
      return '<option value="'+date+'">' + date + '</option>';
    });

    var monthsOptions = _.map(_.range(0, 12), function(month) {
      var value = (options.showMonthNames)
          ? options.monthNames[month]
          : (month + 1);

      return '<option value="'+month+'">' + value + '</option>';
    });

    var yearRange = (schema.yearStart < schema.yearEnd)
      ? _.range(schema.yearStart, schema.yearEnd + 1)
      : _.range(schema.yearStart, schema.yearEnd - 1, -1);

    var yearsOptions = _.map(yearRange, function(year) {
      return '<option value="'+year+'">' + year + '</option>';
    });

    //Render the selects
    var $el = $($.trim(this.template({
      dates: datesOptions.join(''),
      months: monthsOptions.join(''),
      years: yearsOptions.join('')
    })));

    //Store references to selects
    this.$date = $el.find('[data-type="date"]');
    this.$month = $el.find('[data-type="month"]');
    this.$year = $el.find('[data-type="year"]');

    //Create the hidden field to store values in case POSTed to server
    this.$hidden = $('<input type="hidden" name="'+this.key+'" />');
    $el.append(this.$hidden);

    //Set value on this and hidden field
    this.setValue(this.value);

    //Remove the wrapper tag
    this.setElement($el);
    this.$el.attr('id', this.id);
    this.$el.attr('name', this.getName());

    if (this.hasFocus) this.trigger('blur', this);

    return this;
  },

  /**
   * @return {Date}   Selected date
   */
  getValue: function() {
    var year = this.$year.val(),
        month = this.$month.val(),
        date = this.$date.val();

    if (!year || !month || !date) return null;

    return new Date(year, month, date);
  },

  /**
   * @param {Date} date
   */
  setValue: function(date) {
    this.$date.val(date.getDate());
    this.$month.val(date.getMonth());
    this.$year.val(date.getFullYear());

    this.updateHidden();
  },

  focus: function() {
    if (this.hasFocus) return;

    this.$('select').first().focus();
  },

  blur: function() {
    if (!this.hasFocus) return;

    this.$('select:focus').blur();
  },

  /**
   * Update the hidden input which is maintained for when submitting a form
   * via a normal browser POST
   */
  updateHidden: function() {
    var val = this.getValue();

    if (_.isDate(val)) val = val.toISOString();

    this.$hidden.val(val);
  }

}, {
  //STATICS
  template: _.template('\
    <div class="date_picker">\
      <select data-type="date"><%= dates %></select>\
      <select data-type="month"><%= months %></select>\
      <select data-type="year"><%= years %></select>\
    </div>\
  ', null, Form.templateSettings),

  //Whether to show month names instead of numbers
  showMonthNames: true,

  //Month names to use if showMonthNames is true
  //Replace for localisation, e.g. Form.editors.Date.monthNames = ['Janvier', 'Fevrier'...]
  monthNames: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
});

/**
 * DateTime editor
 *
 * @param {Editor} [options.DateEditor]           Date editor view to use (not definition)
 * @param {Number} [options.schema.minsInterval]  Interval between minutes. Default: 15
 */
Form.editors.DateTime = Form.editors.Base.extend({

  events: {
    'change select':  function() {
      this.updateHidden();
      this.trigger('change', this);
    },
    'focus select':   function() {
      if (this.hasFocus) return;
      this.trigger('focus', this);
    },
    'blur select':    function() {
      if (!this.hasFocus) return;
      var self = this;
      setTimeout(function() {
        if (self.$('select:focus')[0]) return;
        self.trigger('blur', self);
      }, 0);
    }
  },

  initialize: function(options) {
    options = options || {};

    Form.editors.Base.prototype.initialize.call(this, options);

    //Option defaults
    this.options = _.extend({
      DateEditor: Form.editors.DateTime.DateEditor
    }, options);

    //Schema defaults
    this.schema = _.extend({
      minsInterval: 15
    }, options.schema || {});

    //Create embedded date editor
    this.dateEditor = new this.options.DateEditor(options);

    this.value = this.dateEditor.value;

    //Template
    this.template = options.template || this.constructor.template;
  },

  render: function() {
    function pad(n) {
      return n < 10 ? '0' + n : n;
    }

    var schema = this.schema;

    //Create options
    var hoursOptions = _.map(_.range(0, 24), function(hour) {
      return '<option value="'+hour+'">' + pad(hour) + '</option>';
    });

    var minsOptions = _.map(_.range(0, 60, schema.minsInterval), function(min) {
      return '<option value="'+min+'">' + pad(min) + '</option>';
    });

    //Render time selects
    var $el = $($.trim(this.template({
      hours: hoursOptions.join(),
      mins: minsOptions.join()
    })));

    //Include the date editor
    $el.find('[data-date]').append(this.dateEditor.render().el);

    //Store references to selects
    this.$hour = $el.find('select[data-type="hour"]');
    this.$min = $el.find('select[data-type="min"]');

    //Get the hidden date field to store values in case POSTed to server
    this.$hidden = $el.find('input[type="hidden"]');

    //Set time
    this.setValue(this.value);

    this.setElement($el);
    this.$el.attr('id', this.id);
    this.$el.attr('name', this.getName());

    if (this.hasFocus) this.trigger('blur', this);

    return this;
  },

  /**
   * @return {Date}   Selected datetime
   */
  getValue: function() {
    var date = this.dateEditor.getValue();

    var hour = this.$hour.val(),
        min = this.$min.val();

    if (!date || !hour || !min) return null;

    date.setHours(hour);
    date.setMinutes(min);

    return date;
  },

  /**
   * @param {Date}
   */
  setValue: function(date) {
    if (!_.isDate(date)) date = new Date(date);

    this.dateEditor.setValue(date);

    this.$hour.val(date.getHours());
    this.$min.val(date.getMinutes());

    this.updateHidden();
  },

  focus: function() {
    if (this.hasFocus) return;

    this.$('select').first().focus();
  },

  blur: function() {
    if (!this.hasFocus) return;

    this.$('select:focus').blur();
  },

  /**
   * Update the hidden input which is maintained for when submitting a form
   * via a normal browser POST
   */
  updateHidden: function() {
    var val = this.getValue();
    if (_.isDate(val)) val = val.toISOString();

    this.$hidden.val(val);
  },

  /**
   * Remove the Date editor before removing self
   */
  remove: function() {
    this.dateEditor.remove();

    Form.editors.Base.prototype.remove.call(this);
  }

}, {
  //STATICS
  template: _.template('\
    <div class="bbf-datetime date_time_picker">\
      <div class="bbf-date-container" data-date></div>\
      <select data-type="hour"><%= hours %></select>\
      :\
      <select data-type="min"><%= mins %></select>\
    </div>\
  ', null, Form.templateSettings),

  //The date editor to use (constructor function, not instance)
  DateEditor: Form.editors.Date
});



  //Metadata
  SceForm.VERSION = Form.VERSION = '0.12.0';

  //Exports
  Backbone.SceForm = SceForm;
  Backbone.Form = Form;

  for ( var key in Form ) {
		if ( !SceForm.hasOwnProperty(key) ) {
			SceForm[key] = Form[key];
		}
  }

  return SceForm;
});
