Package.describe({
  name: "admin-map",
  summary: "Creates a map to show in the admin area",
  version: "0.0.1",
  git: "https://github.com/<username>/admin-map.git",
});

//Npm.depends({});

Package.onUse(function(api) {
  api.versionsFrom('1.3.2');

  api.use(['ecmascript', 'templating', 'modules']);

  var packages = [
    'iron:router',
    'bevanhunt:leaflet'
  ];

  api.use(packages);
  api.imply(packages);

  api.mainModule('server/admin-map.js', 'server');
  api.mainModule('client/admin-map.js', 'client');

  api.addFiles('lib/admin-map.js', ['client', 'server']);

  api.addFiles([
      'client/component/admin-map.css',
      'client/component/admin-map.html',
      'client/component/admin-map.js',
  ], ['client']);

  api.export('AdminMap');
});

Package.onTest(function(api) {
  api.use('admin-map');
  api.use('ecmascript');
  api.use('sanjo:jasmine@1.0.0');
  api.use('velocity:html-reporter@0.10.0');
  api.addFiles('tests/server/admin-map.js', 'server');
  api.addFiles('tests/client/admin-map.js', 'client');
});
