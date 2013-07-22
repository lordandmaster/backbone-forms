;(function(SceForm) {

var same = deepEqual;


module('SceForm#initialize', {
  setup: function() {
    this.sinon = sinon.sandbox.create();
  },

  teardown: function() {
    this.sinon.restore();
  }
});

test('overrides defaults', function() {
  var options = {
    template: _.template('<b></b>'),
    Fieldset: SceForm.Fieldset.extend(),
    Field: SceForm.Field.extend(),
    NestedField: SceForm.NestedField.extend()
  };

  var form = new SceForm(options);

  same(form.template, options.template);
  same(form.Fieldset, options.Fieldset);
  same(form.Field, options.Field);
  same(form.NestedField, options.NestedField);
});

test('uses template stored on form class', function() {
  var oldTemplate = SceForm.template;

  var newTemplate = _.template('<form><b data-fieldsets></b></div>');

  SceForm.template = newTemplate;

  var form = new SceForm();

  same(form.template, newTemplate);

  SceForm.template = oldTemplate;
});

test('uses fieldset and field classes stored on form class', function() {
  var form = new SceForm();

  same(form.Fieldset, SceForm.Fieldset);
  same(form.Field, SceForm.Field);
  same(form.NestedField, SceForm.NestedField);
});

test('sets selectedFields - with options.fields', function() {
	var options = [{ category: { name: 'Set1', content: [{ fields: [
		{ name: 'foo', datatype: 'text' },
		{ name: 'bar', datatype: 'text' },
	]}] }}];

	var form = new SceForm({
		specs: options
	});

	same(form.selectedFields, [ 'foo', 'bar' ]);
});

test('sets selectedFields - defaults to using all fields in schema', function() {
  var form = new SceForm({
    specs: [{ category: { name: 'Set', content: [{ fields: [
		{ name: 'name', datatype: 'text' },
		{ name: 'age', datatype: 'int' }
	]}] }}]
  });

  same(form.selectedFields, ['name', 'age']);
});

test('creates fields', function() {
  this.sinon.spy(SceForm.prototype, 'createField');

  var form = new SceForm({
    specs: [{ category: { name: 'Set', content: [{ fields: [
		{ name: 'name', datatype: 'text' },
		{ name: 'age', datatype: 'int' }
	]}] }}]
  });

  same(form.createField.callCount, 2);
  same(_.keys(form.fields), ['name', 'age']);

  //Check createField() was called correctly
  var args = form.createField.args[0],
      keyArg = args[0],
      schemaArg = args[1];

  same(keyArg, 'name');
  same(schemaArg.type, 'Text');

  var args = form.createField.args[1],
      keyArg = args[0],
      schemaArg = args[1];

  same(keyArg, 'age');
  same(schemaArg.type, 'Text');
});

test('creates fieldsets - with "fieldsets" option', function() {
  this.sinon.spy(SceForm.Fieldset.prototype, 'initialize');
  var newFieldset = SceForm.Fieldset.prototype.initialize;

  var form = new SceForm({
    specs: [{ category: [
		{ name: 'Set1', content: [{ fields: [
			{ name: 'name', datatype: 'text' },
			{ name: 'age', datatype: 'int' }
		]}] },
		{ name: 'Set2', content: [{ fields: [
			{ name: 'hi', datatype: 'boolean' }
		]}] }
	]}]
  });

  same(newFieldset.callCount, 2);
  same(form.fieldsets.length, 2);

  //Check createFieldset() was called correctly
  var args = newFieldset.args;

  same(args[0][0].schema.content[0].fields, ['name', 'age']);
  same(args[1][0].schema.content[0].fields, ['hi']);
});

test('Recurses on dependent fields', function() {
	this.sinon.spy(SceForm.prototype, 'createField');
  
	var form = new SceForm({
		specs: [{ category: 
			{ name: 'Set1', content: [{ fields: [
				{ name: 'name', datatype: 'text', dependent_elements: { field: [
					{ name: 'first', datatype: 'text' },
					{ name: 'age', datatype: 'int' }
				]} }
			]}] }
		}]
	});
	
	same(form.createField.callCount, 3);
	same(_.keys(form.fields), ['name', 'first', 'age']);
	
	var args = form.createField.args;
	
	same(args[0][0], 'name');
	same(args[1][0], 'first');
	same(args[2][0], 'age');
});

test('Recurses on nested categories', function() {
	this.sinon.spy(SceForm.Fieldset.prototype, 'initialize');

	var form = new SceForm({
		specs: [{ category:
			{
				name: 'Set1',
				content: [
					{fields: [
						{ name: 'name', datatype: 'text' },
						{ name: 'age', datatype: 'int' }
					]},
					{category:
						{ name: 'Set2', content: [{fields: [
							{ name: 'hi', datatype: 'boolean' },
							{ name: 'bye', datatype: 'boolean' }
						]}]}
					}
				]
			},
		}]
	});

	var newFieldset = SceForm.Fieldset.prototype.initialize;
	
	same(newFieldset.callCount, 2);
	same(_.keys(form.fields).length, 4);

	var args = newFieldset.args;
	
	same(args[0][0].schema.content[0].fields, ['name', 'age']);
	same(args[1][0].schema.content[0].fields, ['hi', 'bye']);
});

test('Adds extra empty option', function() {
	this.sinon.spy(SceForm.editors.Select.prototype, 'renderOptions');
	
	var form = new SceForm({
		specs: [{ category: { name: 'C', content: [{ fields: [
			{ name: 'a', datatype: 'single_select', options: [] },
			{ name: 'b', datatype: 'multi_select', options: [] },
			{ name: 'c', datatype: 'single_select', options: [], addEmptySelectOption: false }
		]}] }}],
		addEmptySelectOption: true
	});
	
	var getOpts = function(fi) {
		return form.fields[fi].options.schema.options;
	};
	
	var empty_opt = { val: null, label: '' };
	
	same( getOpts('a'), [empty_opt] );
	same( getOpts('b'), [empty_opt] );
	same( getOpts('c'), [] );
});



module('SceForm#createFieldset', {
  setup: function() {
    this.sinon = sinon.sandbox.create();
  },

  teardown: function() {
    this.sinon.restore();
  }
});

test('creates a new instance of the Fieldset defined on the form', function() {
  var MockFieldset = Backbone.View.extend();
  
  var form = new SceForm({
    specs: [{ category: { name: 'Set', content: [{ fields: [
		{ name: 'name', datatype: 'text' },
		{ name: 'age', datatype: 'int' }
	]}] }}],
    Fieldset: MockFieldset
  });

  this.sinon.spy(MockFieldset.prototype, 'initialize');

  var fieldset = form.createFieldset(['name', 'age']);

  same(fieldset instanceof MockFieldset, true);

  //Check correct options were passed
  var optionsArg = MockFieldset.prototype.initialize.args[0][0];

  same(optionsArg.schema, ['name', 'age']);
  same(optionsArg.fields, form.fields);
});



module('SceForm#createField', {
  setup: function() {
    this.sinon = sinon.sandbox.create();

    this.MockField = Backbone.View.extend({
      editor: new Backbone.View()
    });
  },

  teardown: function() {
    this.sinon.restore();
  }
});

test('creates a new instance of the Field defined on the form - with model', function() {
  var MockField = this.MockField;

  var form = new SceForm({
    Field: MockField,
    idPrefix: 'foo',
    model: new Backbone.Model()
  });

  this.sinon.spy(MockField.prototype, 'initialize');

  var field = form.createField('name', { type: 'Text' });

  same(field instanceof MockField, true);

  //Check correct options were passed
  var optionsArg = MockField.prototype.initialize.args[0][0];

  same(optionsArg.form, form);
  same(optionsArg.key, 'name');
  same(optionsArg.schema, { type: 'Text' });
  same(optionsArg.idPrefix, 'foo');
  same(optionsArg.model, form.model);
});

test('creates a new instance of the Field defined on the form - without model', function() {
  var MockField = this.MockField;
  
  var form = new SceForm({
    Field: MockField,
    idPrefix: 'foo',
    data: { name: 'John' }
  });

  this.sinon.spy(MockField.prototype, 'initialize');

  var field = form.createField('name', { type: 'Text' });

  same(field instanceof MockField, true);

  //Check correct options were passed
  var optionsArg = MockField.prototype.initialize.args[0][0];

  same(optionsArg.value, 'John');
});

test('adds listener to all editor events', function() {
  var MockField = this.MockField;
  
  var form = new SceForm({
    Field: MockField,
    idPrefix: 'foo',
    data: { name: 'John' }
  });

  this.sinon.stub(form, 'handleEditorEvent', function() {});

  var field = form.createField('name', { type: 'Text' });

  //Trigger events on editor to check they call the handleEditorEvent callback
  field.editor.trigger('focus');
  field.editor.trigger('blur');
  field.editor.trigger('change');
  field.editor.trigger('foo');

  same(form.handleEditorEvent.callCount, 4);
});



module('SceForm#handleEditorEvent', {
  setup: function() {
    this.sinon = sinon.sandbox.create();
  },

  teardown: function() {
    this.sinon.restore();
  }
});

test('triggers editor events on the form, prefixed with the key name', function() {
  var form = new SceForm(),
      editor = new SceForm.Editor({ key: 'title' });

  var spy = this.sinon.spy();

  form.on('all', spy);

  form.handleEditorEvent('foo', editor);

  same(spy.callCount, 1);

  var args = spy.args[0],
      eventArg = args[0],
      formArg = args[1],
      editorArg = args[2];

  same(eventArg, 'title:foo');
  same(formArg, form);
  same(editorArg, editor);
});

test('triggers general form events', function() {
  var form = new SceForm(),
      editor = new SceForm.Editor({ key: 'title' });

  //Change
  var changeSpy = this.sinon.spy()

  form.on('change', changeSpy);
  form.handleEditorEvent('change', editor);

  same(changeSpy.callCount, 1);
  same(changeSpy.args[0][0], form);

  //Focus
  var focusSpy = this.sinon.spy()

  form.on('focus', focusSpy);
  form.handleEditorEvent('focus', editor);

  same(focusSpy.callCount, 1);
  same(focusSpy.args[0][0], form);

  //Blur
  var blurSpy = this.sinon.spy()

  form.hasFocus = true;

  form.on('blur', blurSpy);
  form.handleEditorEvent('blur', editor);

  setTimeout(function() {
    same(blurSpy.callCount, 1);
    same(blurSpy.args[0][0], form);
  }, 0);
});



module('SceForm#render', {
  setup: function() {
    this.sinon = sinon.sandbox.create();

    this.sinon.stub(SceForm.editors.Text.prototype, 'render', function() {
      this.setElement($('<input class="'+this.key+'" />'));
      return this;
    });

    this.sinon.stub(SceForm.Field.prototype, 'render', function() {
      this.setElement($('<field class="'+this.key+'" />'));
      return this;
    });

    this.sinon.stub(SceForm.Fieldset.prototype, 'render', function() {
      this.setElement($('<fieldset></fieldset>'));
      return this;
    });
  },

  teardown: function() {
    this.sinon.restore();
  }
});

test('returns self', function() {
  var form = new SceForm({
    schema: { name: 'Text', password: 'Password' },
    template: _.template('<div data-fieldsets></div>')
  });

  var returnedValue = form.render();

  same(returnedValue, form);
});

test('with data-editors="*" placeholder, on inner element', function() {
  var form = new SceForm({
    schema: { name: 'Text', password: 'Password' },
    template: _.template('<div><b data-editors="*"></b></div>')
  }).render();

  same(form.$el.html(), '<b data-editors="*"><input class="name"><input class="password"></b>');
});

test('with data-editors="x,y" placeholder, on outermost element', function() {
  var form = new SceForm({
    schema: { name: 'Text', password: 'Password' },
    template: _.template('<b data-editors="name,password"></b>')
  }).render();

  same(form.$el.html(), '<input class="name"><input class="password">');
});

test('with data-fields="*" placeholder, on inner element', function() {
  var form = new SceForm({
    schema: { name: 'Text', password: 'Password' },
    template: _.template('<div><b data-fields="*"></b></div>')
  }).render();

  same(form.$el.html(), '<b data-fields="*"><field class="name"></field><field class="password"></field></b>');
});

test('with data-fields="x,y" placeholder, on outermost element', function() {
  var form = new SceForm({
    schema: { name: 'Text', password: 'Password' },
    template: _.template('<b data-fields="name,password"></b>')
  }).render();

  same(form.$el.html(), '<field class="name"></field><field class="password"></field>');
});

test('with data-fieldsets placeholder, on inner element', function() {
  var form = new SceForm({
    schema: { name: 'Text', password: 'Password' },
    template: _.template('<div><b data-fieldsets></b></div>')
  }).render();

  same(form.$el.html(), '<b data-fieldsets=""><fieldset></fieldset></b>');
});

test('with data-fieldsets placeholder, on outermost element', function() {
  var form = new SceForm({
    schema: { name: 'Text', password: 'Password' },
    template: _.template('<b data-fieldsets></b>')
  }).render();

  same(form.$el.html(), '<fieldset></fieldset>');
});



module('SceForm#validate');

test('validates the form and returns an errors object', function () {
  var form = new SceForm({
    schema: {
      title: {validators: ['required']}
    }
  });
  
  var err = form.validate();

  same(err.title.type, 'required');
  same(err.title.message, 'Required');

  form.setValue({title: 'A valid title'});
  same(form.validate(), null);
});

test('returns model validation errors', function() {
  var model = new Backbone.Model;
  
  model.validate = function() {
    return 'FOO';
  };
  
  var form = new SceForm({
    model: model,
    schema: {
      title: {validators: ['required']}
    }
  });
  
  var err = form.validate();
  
  same(err._others, ['FOO']);
});



module('SceForm#commit');

test('returns validation errors', function() {
  var form = new SceForm({
    model: new Backbone.Model()
  });
  
  //Mock
  form.validate = function() {
    return { foo: 'bar' }
  };
  
  var err = form.commit();
  
  same(err.foo, 'bar');
});

test('returns model validation errors', function() {
  var model = new Backbone.Model();
  
  model.validate = function() {
    return 'ERROR';
  };
  
  var form = new SceForm({
    model: model
  });
  
  var err = form.commit();
  
  same(err._others, ['ERROR']);
});

test('updates the model with form values', function() {
  var model = new Backbone.Model();

  var form = new SceForm({
    model: model,
    idPrefix: null,
    schema: { title: 'Text' }
  });

  //Change the title in the form and save
  form.setValue('title', 'New title');
  form.commit();

  same(model.get('title'), 'New title');
});

test('triggers model change once', function() {
  var model = new Backbone.Model();

  var form = new SceForm({
    model: model,
    schema: { title: 'Text', author: 'Text' }
  });
  
  //Count change events
  var timesCalled = 0;
  model.on('change', function() {
    timesCalled ++;
  });
  
  form.setValue('title', 'New title');
  form.setValue('author', 'New author');
  form.commit();
  
  same(timesCalled, 1);
});

test('can silence change event with options', function() {
  var model = new Backbone.Model();

  var form = new SceForm({
    model: model,
    schema: { title: 'Text', author: 'Text' }
  });
    
  //Count change events
  var timesCalled = 0;
  model.on('change', function() {
    timesCalled ++;
  });

  form.setValue('title', 'New title');

  form.commit({ silent: true });

  same(timesCalled, 0);
});



module('SceForm#getValue');

test('returns form value as an object', function() {
  var data = {
    title: 'Nooope', 
    author: 'Lana Kang'
  };

  var form = new SceForm({
    data: data,
    schema: {
      title: {},
      author: {}
    }
  }).render();
  
  var result = form.getValue();
  
  same(result.title, 'Nooope');
  same(result.author, 'Lana Kang');
});

test('returns specific field value', function() {
  var data = {
    title: 'Danger Zone!', 
    author: 'Sterling Archer'
  };

  var form = new SceForm({
    data: data,
    schema: {
      title: {},
      author: {}
    }
  }).render();
  
  same(form.getValue('title'), 'Danger Zone!');
});



module('SceForm#getEditor');

test('returns the editor for a given key', function() {
  var form = new SceForm({
    schema: { title: 'Text', author: 'Text' }
  });

  same(form.getEditor('author'), form.fields.author.editor);
});



module('SceForm#focus', {
  setup: function() {
    this.sinon = sinon.sandbox.create();
  },

  teardown: function() {
    this.sinon.restore();
  }
});

test('Sets focus on the first editor in the form', function() {
  var form = new SceForm({
    schema: { title: 'Text', author: 'Text' },
    fieldsets: [
      ['title'], ['author']
    ]
  });

  this.sinon.spy(form.fields.title.editor, 'focus');

  form.focus();

  same(form.fields.title.editor.focus.callCount, 1);
});



module('SceForm#blur', {
  setup: function() {
    this.sinon = sinon.sandbox.create();
  },

  teardown: function() {
    this.sinon.restore();
  }
});

test('Removes focus from the currently focused editor', function() {
  var form = new SceForm({
    schema: { title: 'Text', author: 'Text' }
  });

  form.hasFocus = true;

  form.fields.author.editor.hasFocus = true;

  this.sinon.spy(form.fields.author.editor, 'blur');

  form.blur();

  same(form.fields.author.editor.blur.callCount, 1);
});



module('SceForm#trigger');

test('Sets hasFocus to true on focus event', function() {
  var form = new SceForm();

  form.hasFocus = false;

  form.trigger('focus');

  same(form.hasFocus, true);
});

test('Sets hasFocus to false on blur event', function() {
  var form = new SceForm();

  form.hasFocus = true;

  form.trigger('blur');

  same(form.hasFocus, false);
});



module('SceForm#remove', {
  setup: function() {
    this.sinon = sinon.sandbox.create();

    this.sinon.spy(SceForm.Fieldset.prototype, 'remove');
    this.sinon.spy(SceForm.Field.prototype, 'remove');
  },

  teardown: function() {
    this.sinon.restore();
  }
});

test('removes fieldsets, fields and self', function() {  
  var form = new SceForm({
    schema: { title: 'Text', author: 'Text' },
    fieldsets: [
      ['title', 'author']
    ]
  });
  
  form.remove();
  
  same(SceForm.Fieldset.prototype.remove.callCount, 1);

  //Field.remove is called twice each because is called directly and through fieldset
  //This is done in case fieldsets are not used, e.g. fields are included directly through template
  same(SceForm.Field.prototype.remove.callCount, 4);
});



module('SceForm#submit', {
	setup: function() {
		this.sinon = sinon.sandbox.create();
	},
	
	teardown: function() {
		this.sinon.restore();
	}
});

test('Creates submit button', function() {
	var caught = false;
	var btn1 = $('<input type="submit"/>');
	var btn2 = $('<input type="image"/>');
	var btn3 = $('<button></button>');
	
	var form = new SceForm({
		fieldTemplate: function() { return '<span class="hello" data-editor></span>'; },
		submit: {
			html: btn1.add(btn2).add(btn3)
		},
		onSubmit: function(e) { caught = true; return false; }
	});
	
	form.render();
	btn3.click(function() { form.$el.submit(); });
	
	caught = false;
	btn1.click();
	same(caught, true);
	
	caught = false;
	btn2.click();
	same(caught, true);
	
	caught = false;
	btn3.click();
	same(caught, true);
	
	caught = false;
	form.$el.submit();
	same(caught, true);
	
	same(cleanse(btn1.parent()[0].className), 'hello');
	same(cleanse(btn2.parent()[0].className), 'hello');
	same(cleanse(btn3.parent()[0].className), 'hello');
	
});

test('Dynamically displays errors', function() {
	this.sinon.spy( SceForm.Field.prototype, 'setSchemaAttr' );
	
	var form = new SceForm({
		fieldTemplate: function() { return '<span>' + data.schemaAttrs.errortext + '</span>'; },
		schema: { title: {}, name: {} }
	});
	
	form.render();
	form.setErrors({ title: 'error' });
	
	var func = SceForm.Field.prototype.setSchemaAttr;
	
	same(func.callCount, 1);
	same(func.args[0], [ 'errortext', 'error' ]);
	
	form.setErrors({ title: 'hi', name: ['bye', 'bye'] });
	
	same(func.callCount, 3);
	same(cleanse(func.args[1][1]), 'hi');
	same(cleanse(func.args[2][1]), 'bye<br/>bye');
});

test('Wrong attribute throws error', function() {
	var caught = false;
	
	var form = new SceForm();
	
	try {
		form.setErrors({ title: 'ok' });
	}
	catch (e) {
		caught = e.message;
	}
	
	same(caught, "Unknown field 'title'");
});

})(Backbone.SceForm);