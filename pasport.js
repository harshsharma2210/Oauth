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
const JWT = require('jsonwebtoken');
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;

const signToken = (user) => {
    return JWT.sign({ name: user.name, email: user.email, pic: user.pic }, "airgyaan" ,{ expiresIn: 86400 * 7 });
}

app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(express.json());

// MONGOOSE SETUP

mongoose.connect("mongodb://localhost:27017/airgyaan", { useUnifiedTopology: true, useNewUrlParser: true })
    .then(() => console.log(' Database connection succesful'))
    .catch((err) => console.error(err));

mongoose.set("useCreateIndex", true);


app.set('view engine', 'ejs');



// Initializes passport and passport sessions
app.use(passport.initialize());
app.use(passport.session());

// JSON WEB TOKENS STRATEGY
const opts = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: "airgyaan"
}
passport.use(new JwtStrategy(opts, function (jwt_payload, done) {
    User.findOne({ id: jwt_payload.sub }, function (err, user) {
        if (err) {
            return done(err, false);
        }
        if (user) {
            return done(null, user);
        } else {
            return done(null, false);
            // or you could create a new account
        }
    });
}));


// AUTH PAGE
app.get('/', function (req, res) {
    res.render('pages/auth');
});
// CHANGE THE ROUTES ACC TO APP
// res.render("pages/success", { name: req.user.name, email: req.user.email, pic: req.user.pic });
app.get('/success', passport.authenticate('jwt', { session: false }), (req, res) => {
    res.send('Worked! User id is: ' + req.user._id);
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
        User.findOne({ email: profile.emails[0].value }).then((currentUser) => {
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
        const token = signToken(req.user);
        console.log(token);
        res.redirect('/success');
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
        User.findOne({ email: profile.emails[0].value }).then((currentUser) => {
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
    clientID: process.env.LINKEDIN_CLIENT_ID,
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
    callbackURL: process.env.LINKEDIN_CALLBACK_URL,
    scope: ['r_emailaddress', 'r_liteprofile'],
}, function (token, tokenSecret, profile, done) {
    // To check if a user exist
    User.findOne({ email: profile.emails[0].value }).then((currentUser) => {
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
