// retries a failed promise before giving up

const retryPromise = fn => {

    const attempt = async (...callArgs) => {
        try {
            return fn(...callArgs);
        } catch (e) {
            console.log('reattempting ', callArgs);
            return fn(...callArgs);
        }

    };

    return attempt;

};

module.exports = retryPromise;
