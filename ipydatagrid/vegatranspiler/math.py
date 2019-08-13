"""Math module that implements mocking Vega mathematical functions."""

math_functions = ['isNaN', 'isFinite', 'abs', 'acos', 'asin', 'atan', 'atan2', 'ceil', 'cos', 'exp',
                  'floor', 'log', 'max', 'min', 'pow', 'random', 'round', 'sin', 'sqrt', 'tan', 'clamp']

error_message = ' is a mocking function that is not supposed to be called outside of an `Expr` function'


def isNaN(value):
    """Return true if value is not a number. Same as JavaScript’s isNaN."""
    raise RuntimeError('isNaN' + error_message)


def isFinite(value):
    """Return true if value is a finite number. Same as JavaScript’s isFinite."""
    raise RuntimeError('isFinite' + error_message)


def abs(value):
    """Returns the absolute value of value. Same as JavaScript’s Math.abs."""
    raise RuntimeError('abs' + error_message)


def acos(value):
    """Trigonometric arccosine. Same as JavaScript’s Math.acos."""
    raise RuntimeError('acos' + error_message)


def asin(value):
    """Trigonometric arcsine. Same as JavaScript’s Math.asin."""
    raise RuntimeError('asin' + error_message)


def atan(value):
    """Trigonometric arctangent. Same as JavaScript’s Math.atan."""
    raise RuntimeError('atan' + error_message)


def atan2(dy, dx):
    """Returns the arctangent of dy / dx. Same as JavaScript’s Math.atan2."""
    raise RuntimeError('atan2' + error_message)


def ceil(value):
    """Rounds value to the nearest integer of equal or greater value. Same as JavaScript’s Math.ceil."""
    raise RuntimeError('ceil' + error_message)


def clamp(value, min, max):
    """Restricts value to be between the specified min and max."""
    raise RuntimeError('clamp' + error_message)


def cos(value):
    """Trigonometric cosine. Same as JavaScript’s Math.cos."""
    raise RuntimeError('cos' + error_message)


def exp(exponent):
    """Returns the value of e raised to the provided exponent. Same as JavaScript’s Math.exp."""
    raise RuntimeError('exp' + error_message)


def floor(value):
    """Rounds value to the nearest integer of equal or lower value. Same as JavaScript’s Math.floor."""
    raise RuntimeError('floor' + error_message)


def log(value):
    """Returns the natural logarithm of value. Same as JavaScript’s Math.log."""
    raise RuntimeError('log' + error_message)


def max(*values):
    """Returns the maximum argument value. Same as JavaScript’s Math.max."""
    raise RuntimeError('max' + error_message)


def min(*values):
    """Returns the minimum argument value. Same as JavaScript’s Math.min."""
    raise RuntimeError('min' + error_message)


def pow(value, exponent):
    """Returns value raised to the given exponent. Same as JavaScript’s Math.pow."""
    raise RuntimeError('pow' + error_message)


def random():
    """Returns a pseudo-random number in the range [0,1). Same as JavaScript’s Math.random."""
    raise RuntimeError('random' + error_message)


def round(value):
    """Rounds value to the nearest integer. Same as JavaScript’s Math.round."""
    raise RuntimeError('round' + error_message)


def sin(value):
    """Trigonometric sine. Same as JavaScript’s Math.sin."""
    raise RuntimeError('sin' + error_message)


def sqrt(value):
    """Square root function. Same as JavaScript’s Math.sqrt."""
    raise RuntimeError('sqrt' + error_message)


def tan(value):
    """Trigonometric tangent. Same as JavaScript’s Math.tan."""
    raise RuntimeError('tan' + error_message)
