const passport = require('passport');

exports.login = passport.authenticate('local', {
  failureRedirect: '/login',
  failureFlash: 'Invalid Username and/or Password!',
  successRedirect: '/',
  successFlash: `Welcome Back!`
});

exports.logout = (req, res) => {
  req.logout();
  req.flash('success', 'You are now logged out!');
  res.redirect('/');
}

exports.isLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) {
    next(); //pass to next module
    return;
  }
  req.flash('error', 'You must be logged in to create a store');
  res.redirect('/login');
}