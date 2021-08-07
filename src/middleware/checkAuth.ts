function checkAuth(req, res, next) {
    if (!req.headers || !req.headers['authorization']) {
        throw Error('No auth header');
    }
    var tokenString = req.headers['authorization'];
    var matchResult = tokenString.match(/Bearer\s+(.*)/);
    if (!matchResult || !matchResult[1]) {
        throw Error('Invalid header format');
    }
    req.token = matchResult[1];
    next();
}

module.exports = checkAuth;
