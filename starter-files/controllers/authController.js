const passport = require('passport');
const crypto = require('crypto');
const mongoose = require('mongoose');
const User = mongoose.model('User');

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
};

exports.forgot = async (req, res) => {
  // 1. See if user exists
  const user = await User.findOne({
    email: req.body.email
  });
  if (!user) {
    req.flash('error', `There is no account with the email address <strong>${req.body.email}</strong>`);
    return res.redirect('/login');
  }
  // 2. Set reset tokens and expiry on their account
  user.resetPasswordToken = crypto.randomBytes(20).toString('hex');
  user.resetPasswordExpires = Date.now() + 3600000; // 1 hour from now
  await user.save();
  // 3. Send them an email with the token
  user.resetURL = `http://${req.headers.host}/account/reset/${user.resetPasswordToken}`;
  req.flash('success', `You have been emailed a password reset link ${user.resetURL}`);
  // 4. Redirect to login page
  res.redirect('/login');
}

exports.reset = async (req, res) => {
  const user = await User.findOne({
    resetPasswordToken: req.params.token,
    resetPasswordExpires: {
      $gt: Date.now()
    }
  });
  if (!user) {
    req.flash('error', 'This reset password link is invalid or has expired');
    return res.redirect('/login');
  }
  // if there is a user, show the reset password form
  res.render('reset', {
    title: 'Reset your Password'
  });
};

exports.confirmedPasswords = (req, res, next) => {
  if (req.body.password === req.body['password-confirm']) {
    next();
    return;
  }
  req.flash('error', 'Passwords do not match!');
  res.redirect('back');
};

exports.updatePassword = async (req, res) => {
  const user = await User.findOne({
    resetPasswordToken: req.params.token,
    resetPasswordExpires: {
      $gt: Date.now()
    }
  });
  if (!user) {
    req.flash('error', `There is no account with the email address <strong>${req.body.email}</strong>`);
    return res.redirect('/login');
  }
  //update user password
  await user.setPassword(req.body.password);

  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  const updatedUser = await user.save();

  //login user
  await req.login(updatedUser);
  req.flash('success', 'Your password has been updated and you are logged in.');
  res.redirect('/');
};