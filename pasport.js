require("dotenv").config();

/*  EXPRESS SETUP  */
const express = require('express');
const app = express();
const bodyParser = require("body-parser");
const session = require('express-session');
const LinkedInStrategy = require('passport-linkedin-oauth2').Strategy;
const cookieSession = require('cookie-session');
const mongoose = require('mongoose');
const passport = require('passport');
const User = require('./models/user-model.js');


app.use(bodyParser.urlencoded({
    extended: true
}));

// MONGOOSE SETUP

mongoose.connect("mongodb://localhost:27017/airgyaan", { useUnifiedTopology: true, useNewUrlParser: true })
    .then(() => console.log(' Database connection succesful'))
    .catch((err) => console.error(err));

mongoose.set("useCreateIndex", true);

// For an actual app you should configure this with an experation time, better keys, proxy and secure
app.use(cookieSession({
    name: 'tuto-session',
    keys: ['key1', 'key2'],
    maxAge: 24 * 60 * 60 * 1000
}));

app.set('view engine', 'ejs');

// Auth middleware that checks if the user is logged in
const isLoggedIn = (req, res, next) => {
    if (req.user) {
        next();
    } else {
        res.redirect('/');
    }
}

// Initializes passport and passport sessions
app.use(passport.initialize());
app.use(passport.session());

// AUTH PAGE
app.get('/', function (req, res) {
    res.render('pages/auth');
});
// CHANGE THE ROUTES ACC TO APP
app.get('/success', isLoggedIn, (req, res) => {
    res.render("pages/success", { name: req.user.name, email: req.user.email, pic: req.user.pic });
});
app.get('/error', (req, res) => res.send("error logging in"));

/*  Google AUTH  */

const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((id, done) => {
    User.findById(id).then(user => {
        done(null, user);
    });
});


passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
},
    function (accessToken, refreshToken, profile, done) {
        // To check if a user exist
        User.findOne({ platformId: profile.id }).then((currentUser) => {
            if (currentUser) {
                // User Found
                console.log("User is: " + currentUser);
                done(null, currentUser);
            }
            else {
                // User not found, Creating Database
                new User({
                    name: profile.displayName,
                    platformId: profile.id,
                    email: profile.emails[0].value,
                    pic: profile.photos[0].value

                }).save().then((newUser) => {
                    console.log("New user created" + newUser);
                    done(null, newUser);
                });
            }
        });
    }
));

app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/error' }),
    function (req, res) {
        // Successful authentication, redirect success.
        res.redirect('/success');
    });

app.get("/logout", (req, res) => {
    req.logOut();
    res.redirect("/")
});


/*  FACEBOOK AUTH  */

const FacebookStrategy = require('passport-facebook').Strategy;

passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: process.env.FACEBOOK_CALLBACK_URL
},
    function (accessToken, refreshToken, profile, done) {
        // To check if a user exist
        User.findOne({ platformId: profile.id }).then((currentUser) => {
            if (currentUser) {
                // User Found
                console.log("User is: " + currentUser);
                done(null, currentUser);
            }
            else {
                // User not found, Creating Database
                new User({
                    name: profile.displayName,
                    platformId: profile.id,
                    email: profile.emails[0].value,
                    pic: profile.photos[0].value

                }).save().then((newUser) => {
                    console.log("New user created" + newUser);
                    done(null, newUser);
                });
            }
        });
    }
));

app.get('/auth/facebook',
    passport.authenticate('facebook'));

app.get('/auth/facebook/callback',
    passport.authenticate('facebook', { failureRedirect: '/error' }),
    function (req, res) {
        res.redirect('/success');
    }
);


// LINKEDIN LOGIN

passport.use(new LinkedInStrategy({
    clientID: process.env.LINKEDIN_APP_ID,
    clientSecret: process.env.LINKEDIN_APP_SECRET,
    callbackURL: process.env.LINKEDIN_CALLBACK_URL,
    scope: ['r_emailaddress', 'r_liteprofile'],
}, function (token, tokenSecret, profile, done) {
    // To check if a user exist
    User.findOne({ platformId: profile.id }).then((currentUser) => {
        if (currentUser) {
            // User Found
            console.log("User is: " + currentUser);
            done(null, currentUser);
        }
        else {
            // User not found, Creating Database
            new User({
                name: profile.displayName,
                platformId: profile.id,
                email: profile.emails[0].value,
                pic: profile.photos[0].value

            }).save().then((newUser) => {
                console.log("New user created" + newUser);
                done(null, newUser);
            });
        }
    });
}
));

app.get('/auth/linkedin', passport.authenticate('linkedin', {
    scope: ['r_emailaddress', 'r_liteprofile'],
}));

app.get('/auth/linkedin/callback',
    passport.authenticate('linkedin', {
        successRedirect: '/success',
        failureRedirect: '/error'
    }));


//LOGOUT
app.get('/logout', function (req, res) {
    req.logout();
    res.redirect('/');
});


const port = process.env.PORT || 3000;
app.listen(port, () => console.log('App listening on port ' + port));
