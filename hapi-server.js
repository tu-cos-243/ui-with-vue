// Standard Node modules
const Path = require('path');   // Files and directories

// Hapi
const Hapi = require('@hapi/hapi');   // Server
const Inert = require('@hapi/inert'); // Static files
const Handlebars = require("handlebars");

const init = async () => {
    // Create a new Hapi server
    const server = Hapi.server({
        host: 'localhost',
        port: 3000,
        routes: {
            files: {
                relativeTo: Path.join(__dirname, 'public')
            }
        }
    });

    // Output endpoints at startup.
    await server.register({plugin: require('blipp'), options: {showAuth: true}});

    // Log stuff.
    await server.register({
        plugin: require('hapi-pino'),
        options: {
            prettyPrint: true
        }
    });

    // Configure templating.
    await server.register(require('@hapi/vision'));
    server.views({
        engines: {
            hbs: Handlebars,
            html: Handlebars
        },
        isCached: false,            // Don't cache pages during development.
        defaultExtension: 'hbs',    // Most common
        relativeTo: __dirname,      // Template directory tree right here
        path: './templates',        // Top-level template directory
        layout: 'base',             // Default layout file
        layoutPath: './templates/layout',       // Location of layout file(s)
        partialsPath: './templates/partials'    // Location of partial file(s)
    });

    // Configure static file service.
    await server.register(Inert);

    // Configure routes.
    server.route([
        {
            method: 'GET',
            path: '/',
            config: {
                description: 'Home page'
            },
            handler: async (request, h) => {
                return h.view('index');
            }
        },
        {
            method: 'GET',
            path: '/sign-up',
            options: {
                description: 'Sign-up page'
            },
            handler: async (request, h) => {
                return h.view('sign-up.hbs');
            }
        },
        {
            method: 'POST',
            path: '/sign-up',
            options: {
                description: 'Handle sign-up request',
            },
            handler: async (request, h) => {
                // Don't rely on client code to reliably error check -- can be spoofed!
                let messages = [];
                if (!request.payload.email.match(/^\w+@\w+\.\w{2,}$/)) {
                    messages.push(`'${request.payload.email}' is an invalid email address`);
                }

                if (!request.payload.password.match(/[A-Z]/)) {
                    messages.push('Password requires at least one upper-case letter');
                }

                if (!request.payload.password.match(/[a-z]/)) {
                    messages.push('Password requires at least one lower-case letter');
                }

                if (!request.payload.password.match(/[0-9]/)) {
                    messages.push('Password requires at least one digit');
                }

                if (request.payload.password.length < 8) {
                    messages.push('Password must be at least eight characters long');
                }

                if (messages.length) {
                    return h.view('sign-up.hbs', {errors: messages})
                } else {
                    return h.view('index', {flash: ['Signed up successfully!']});
                }
            }
        },
        {
            method: 'GET',
            path: '/public/{param*}',
            config: {
                description: 'Public assets'
            },
            handler: {
                directory: {
                    path: '.',
                    redirectToSlash: true,
                    index: true,
                    listing: true
                }
            }
        }
    ]);

    // Start the server.
    await server.start();
}

process.on('unhandledRejection', err => {
    console.error(err);
    process.exit(1);
});

// Go!
init();