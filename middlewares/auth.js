const bcrypt = require('bcrypt');
const { Token } = require('../models');
const { User, Email } = require('../models');
const emailer = require('../mail');

const CONFIRM_EMAIL_TYPE = 'ce';
const SESSION_TYPE = 's';
const PASS_RECOVERY_TYPE = 'r';

class Auth {
  static async sessionChecker(req, res, next) {
    const token = await Token.getActiveTokenByHash(req.query.hash, SESSION_TYPE);

    if (!Auth.isCurrentlyActive(token)) {
      const result = {
        error: {
          status: 400,
          message: 'Session invalid',
        },
      };
      res.status(400).send(result);
    } else {
      res.locals.user = await User.get(token.userId);
      next();
    }
  }

  static async register(req, res) {
    const hash = await Auth.generateToken(res.locals.user, CONFIRM_EMAIL_TYPE);

    const options = {
      from: '"Foraneos UDG Team" <info@foraneos-udg.tk>',
      to: res.locals.user.mainEmail,
      subject: 'Confirmation Email ✔',
      text: 'Presiona Para Confirmar',
      html: `<p>Presiona
      <a href="http://localhost:3000/api/auth/confirmEmail?hash=${hash}&emailId=${res.locals.user.mainEmailId}">
      aqui</a> para activar tu correo</p>`,
    };
    emailer.sendMail(options);

    res.send({
      user: res.locals.user,
    });
  }

  static async reqConfirmEmail(req, res) {
    const hash = await Auth.generateToken(res.locals.user, CONFIRM_EMAIL_TYPE);

    res.locals.user.emails.forEach((email) => {
      if (email.verified === 1) {
        const options = {
          from: '"Foraneos UDG Team" <info@foraneos-udg.tk>',
          to: email.email,
          subject: 'Confirmation Email ✔',
          text: 'Presiona Para Confirmar',
          html: `<p>Presiona
          <a href="http://localhost:3000/api/auth/confirmEmail?hash=${hash}&emailId=${res.locals.email.id}">
          aqui</a> para activar tu correo</p>`,
        };
        emailer.sendMail(options);
      }
    });

    const result = {
      message: {
        status: 200,
        message: 'Email sended',
      },
    };
    res.send(result);
  }

  static async confirmEmail(req, res) {
    const token = await Token.getActiveTokenByHash(req.query.hash,
      CONFIRM_EMAIL_TYPE);
    let result = '';

    if (!Auth.isCurrentlyActive(token)) {
      // Revisar que error poner si no se encuentra un token de confirmacion de correo
      result = {
        error: {
          status: 401,
          message: 'Token not active',
        },
      };
      res.status(401);
    } else {
      const email = await Email.get(req.query.emailId);

      if (email === 0) {
        result = {
          error: {
            status: 404,
            message: 'Email not found',
          },
        };
        res.status(404);
      } else if (email.userId !== token.userId) {
        result = {
          error: {
            status: 401,
            message: 'The email doesnt belong to the user',
          },
        };
        res.status(401);
      } else {
        await Email.verifyEmail(email.id);
        await Token.deactivate(token.id);
        result = {
          message: {
            status: 200,
            message: 'Email confirmed',
          },
        };
      }
    }
    res.send(result);
  }

  static async login(req, res) {
    const userId = await User.checkUsernamePass(req.query);

    if (userId === 0) {
      const result = {
        error: {
          status: 401,
          message: 'Username or Password incorrect',
        },
      };
      res.status(401).send(result);
    } else {
      const token = await Token.getActiveToken(userId, SESSION_TYPE);

      if (!Auth.isCurrentlyActive(token)) {
        const user = await User.get(userId);

        const hash = await Auth.generateToken(user,
          SESSION_TYPE);

        res.send({
          hash,
        });
      } else {
        const result = {
          hash: token.hash,
          message: {
            status: 200,
            message: 'Session started',
          },
        };
        res.send(result);
      }
    }
  }

  static async logout(req, res) {
    const { user } = res.locals;

    const token = await Token.getActiveToken(user.id, SESSION_TYPE);

    if (token !== 0) {
      await Token.deactivate(token.id);
    }

    const result = {
      message: {
        status: 200,
        message: 'Session finished',
      },
    };
    res.send(result);
  }

  static async reqPassRecovery(req, res) {
    const user = await User.getByEmail(req.query);

    if (user === 0) {
      const result = {
        error: {
          status: 401,
          message: 'User doesnt exist',
        },
      };
      res.status(401).send(result);
    } else {
      const hash = await Auth.generateToken(user, PASS_RECOVERY_TYPE);

      const options = {
        from: '"Foraneos UDG Team" <info@foraneos-udg.tk>',
        to: user.mainEmail,
        subject: 'Recovery Account Email ✔',
        text: 'Presiona Para Confirmar',
        html: `<p>Presiona
        <a href="http://localhost:3000/api/auth/passwordRecovery?hash=${hash}">
        aqui</a> para recuperar tu contraseña</p>`,
      };
      emailer.sendMail(options);

      const result = {
        message: {
          status: 200,
          message: 'Email sended',
        },
      };
      res.send(result);
    }
  }

  static async passRecovery(req, res) {
    const token = await Token.getActiveTokenByHash(req.query.hash, PASS_RECOVERY_TYPE);

    if (!Auth.isCurrentlyActive(token)) {
      const result = {
        error: {
          status: 401,
          message: 'Token not active',
        },
      };
      res.status(401).send(result);
    } else {
      await Token.deactivate(token.id);
      await User.patch(token.userId, { password: req.query.password });

      const result = {
        message: {
          status: 200,
          message: 'Password changed',
        },
      };

      res.send(result);
    }
  }

  static async generateToken({ username, id }, type) {
    let hash = '';

    const createdAt = new Date();
    const expires = createdAt;

    if (type === CONFIRM_EMAIL_TYPE) {
      expires.setYear((expires.getFullYear() + 5));
    } else if (type === SESSION_TYPE) {
      expires.setHours((expires.getHours() + 1));
    } else if (type === PASS_RECOVERY_TYPE) {
      expires.setMinutes((expires.getMinutes() + 10));
    }

    const key = `${username}${createdAt}`;

    hash = bcrypt.hashSync(key, Number(process.env.SECRET));

    await Token.create({
      hash,
      createdAt,
      expires,
      type,
      userId: id,
    });

    return hash;
  }

  static isCurrentlyActive(token) {
    if (token === 0) {
      return false;
    }

    const time = new Date();
    if (time > token.expires) {
      Token.deactivate(token.id);
      return false;
    }
    return true;
  }
}

module.exports = Auth;
