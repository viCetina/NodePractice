const passport = require('passport');
const crypto = require ('crypto');
const mongoose = require ('mongoose');
const User = mongoose.model('User');
const promisify = require('es6-promisify');
const mail = require('../handlers/mail');

exports.login = passport.authenticate('local', {
	failureRedirect: '/login',
	failureFlash: 'Failed Login!',
	successRedirect: '/',
	successFlash: 'You are Logged in!'
});

exports.logout = (req, res) => {
	req.logout();
	req.flash('success', 'You are now logged out!');
	res.redirect('/');
};

exports.isLoggedIn = (req, res, next) => {
	if(req.isAuthenticated()) {
		next();
		return;
	}
	req.flash('error', 'Oops, you need to login!');
	res.redirect('/login');
};

exports.forgot = async (req, res) => {
	//1. see if the email exist
	const user = await User.findOne({ email: req.body.email });
	if(!user){
		req.flash('error', 'No account with that email exist');
		return res.redirect('/login');
	}
	//2. set reset tokens
	user.resetPasswordToken = crypto.randomBytes(20).toString('hex');
	user.resetPasswordExpires = Date.now() + 3600000; //1 hour from now
	await user.save();
	//3. send an email whit the token
	const resetURL = `http://${req.headers.host}/account/reset/${user.resetPasswordToken}`;
	await mail.send({
		user,
		subject: 'Password Reset',
		resetURL,
		filename: 'password-reset'
	});
	req.flash('success', `You have been mailed a password reset link.`);
	//4. redirect
	res.redirect('/login');

};

exports.reset = async (req, res) => {
	const user = await User.findOne({
		resetPasswordToken: req.params.token,
		resetPasswordExpires: { $gt: Date.now() }
	});
	if(!user) { //this for when the user dont exist
		req.flash('error', 'Pasword is invalid or expired');
		return res.redirect('/login');
	}
	//if the user exist, show the reset pasword form
	res.render('reset', { title: 'Reset your password' });
};

exports.confirmedPassword = (req, res, next) => {
	if (req.body.password === req.body['password-confirm']) {
		next();
		return;
	}
	req.flash('error', 'Passwords do not match!');
	res.redirect('back');
};

exports.update = async (req, res) => {
	const user = await User.findOne({
		resetPasswordToken: req.params.token,
		resetPasswordExpires: { $gt: Date.now() }
	});

	if (!user) {
		req.flash('error', 'Passwords reset is invalid or has expired!');
		return res.redirect('/login');
	}

	const setPassword = promisify(user.setPassword, user);
	await setPassword(req.body.password);
	user.resetPasswordToken = undefined;
	user.resetPasswordExpires = undefined;
	const updatedUser = await user.save();
	await req.login(updatedUser);
	req.flash('success', 'Your password has been reset!');
	res.redirect('/');
};