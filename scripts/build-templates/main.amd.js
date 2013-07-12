/**
 * Backbone Forms v{{version}}
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
define(['jquery', 'underscore', 'backbone'], function($, _, Backbone) {

  {{body}}


  //Metadata
  SceForm.VERSION = Form.VERSION = '{{version}}';

  //Exports
  Backbone.SceForm = SceForm;
  Backbone.Form = Form;

  return SceForm;
});
