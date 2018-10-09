const {
  livesIn,
} = require('../models');

exports.showAll = async (req, res) => {
  let result = await livesIn.getAll(req.params.userId);

  if (result === 0) {
    result = {
      error: {
        status: 404,
        message: 'Resource not found',
      },
    };
    res.status(404);
  }

  res.send(result);
};
