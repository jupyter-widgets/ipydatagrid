"""Python to VegaExpression transpiler."""

import ast
import inspect
import types

from .math import math_functions
from .constants import constants


def return_stmt(stmt, whitelist):
    """Turn a Python return statement into a vega-expression."""
    return pythonstmt2vega(stmt.value, whitelist)


def if_stmt(stmt, whitelist):
    """Turn a Python if statement into a vega-expression."""
    def check_sanity(stmt_body):
        if len(stmt_body) > 1 and not isinstance(stmt_body[0], ast.Return) and not isinstance(stmt_body[0], ast.If):
            raise RuntimeError('Only a `return` or an `if` statement is allowed inside an `if` statement')

    check_sanity(stmt.body)
    check_sanity(stmt.orelse)

    return 'if({}, {}, {})'.format(
        pythonstmt2vega(stmt.test, whitelist),
        pythonstmt2vega(stmt.body[0], whitelist),
        pythonstmt2vega(stmt.orelse[0], whitelist)
    )


def nameconstant_expr(expr, _):
    """Turn a Python nameconstant expression into a vega-expression."""
    if expr.value is False:
            return 'false'
    if expr.value is True:
        return 'true'
    if expr.value is None:
        return 'null'
    raise NameError('name \'{}\' is not defined, only a subset of Python is supported'.format(str(expr.value)))


def num_expr(expr, _):
    """Turn a Python num expression into a vega-expression."""
    return repr(expr.n)


def str_expr(expr, _):
    """Turn a Python str expression into a vega-expression."""
    return repr(expr.s)


def list_expr(expr, whitelist):
    """Turn a Python list expression into a vega-expression."""
    return '[{}]'.format(', '.join(pythonstmt2vega(elt, whitelist) for elt in expr.elts))


def dict_expr(expr, whitelist):
    """Turn a Python dict expression into a vega-expression."""
    return '{{{}}}'.format(
        ', '.join([
            '{}: {}'.format(pythonstmt2vega(expr.keys[idx], whitelist), pythonstmt2vega(expr.values[idx], whitelist))
            for idx in range(len(expr.keys))
        ])
    )


def unaryop_expr(expr, whitelist):
    """Turn a Python unaryop expression into a vega-expression."""
    if isinstance(expr.op, ast.Not):
        return '!({})'.format(pythonstmt2vega(expr.operand, whitelist))

    raise RuntimeError('Unsupported {} operator, only a subset of Python is supported'.format(str(expr.op)))


def boolop_expr(expr, whitelist):
    """Turn a Python boolop expression into a vega-expression."""
    return '{} {} {}'.format(
        pythonstmt2vega(expr.values[0], whitelist),
        '||' if isinstance(expr.op, ast.Or) else '&&',
        pythonstmt2vega(expr.values[1], whitelist)
    )


def _binop_expr_impl(left_expr, op, right_expr, whitelist=[]):
    operator_mapping = {
        ast.Eq: '==', ast.NotEq: '!=',
        ast.Lt: '<', ast.LtE: '<=',
        ast.Gt: '>', ast.GtE: '>=',
        ast.Is: '===', ast.IsNot: '!==',
        ast.Add: '+', ast.Sub: '-',
        ast.Mult: '*', ast.Div: '/',
        ast.Mod: '%'
    }

    left = left_expr if isinstance(left_expr, str) else pythonstmt2vega(left_expr, whitelist)
    right = pythonstmt2vega(right_expr, whitelist)

    if isinstance(op, ast.In):
        return 'indexof({}, {}) != -1'.format(right, left)
    if isinstance(op, ast.NotIn):
        return 'indexof({}, {}) == -1'.format(right, left)
    if isinstance(op, ast.Pow):
        return 'pow({}, {})'.format(left, right)

    operator = operator_mapping.get(op.__class__)

    if operator is None:
        raise RuntimeError('Unsupported {} operator, only a subset of Python is supported'.format(repr(op)))

    return '{} {} {}'.format(left, operator, right)


def binop_expr(expr, whitelist):
    """Turn a Python binop expression into a vega-expression."""
    return _binop_expr_impl(expr.left, expr.op, expr.right, whitelist)


def if_expr(expr, whitelist):
    """Turn a Python if expression into a vega-expression."""
    return '{} ? {} : {}'.format(
        pythonstmt2vega(expr.test, whitelist),
        pythonstmt2vega(expr.body, whitelist),
        pythonstmt2vega(expr.orelse, whitelist)
    )


def compare_expr(expr, whitelist):
    """Turn a Python compare expression into a vega-expression."""
    left_operand = expr.left

    for idx in range(len(expr.comparators)):
        left_operand = _binop_expr_impl(left_operand, expr.ops[idx], expr.comparators[idx], whitelist)

    return left_operand


def name_expr(expr, whitelist):
    """Turn a Python name expression into a vega-expression."""
    if expr.id in constants or expr.id in whitelist:
        return expr.id
    raise NameError('name \'{}\' is not defined, only a subset of Python is supported'.format(expr.id))


def call_expr(expr, whitelist):
    """Turn a Python call expression into a vega-expression."""
    if isinstance(expr.func, ast.Name):
        func_name = expr.func.id

    if isinstance(expr.func, ast.Attribute):
        func_name = expr.func.attr

    if func_name in math_functions:
        return '{}({})'.format(
            func_name,
            ', '.join([pythonstmt2vega(arg, whitelist) for arg in expr.args])
        )

    raise NameError('name \'{}\' is not defined, only a subset of Python is supported'.format(func_name))


def attribute_expr(expr, _):
    """Turn a Python attribute expression into a vega-expression."""
    return expr.attr


stmt_mapping = {
    ast.Return: return_stmt,
    ast.If: if_stmt,
    ast.NameConstant: nameconstant_expr,
    ast.Num: num_expr,
    ast.Str: str_expr,
    ast.Tuple: list_expr,
    ast.List: list_expr,
    ast.Dict: dict_expr,
    ast.UnaryOp: unaryop_expr,
    ast.BoolOp: boolop_expr,
    ast.BinOp: binop_expr,
    ast.IfExp: if_expr,
    ast.Compare: compare_expr,
    ast.Name: name_expr,
    ast.Call: call_expr,
    ast.Attribute: attribute_expr,
}


def pythonstmt2vega(stmt, whitelist=[]):
    """Turn a Python statement object into a Vega expression."""
    func = stmt_mapping.get(stmt.__class__)

    if func is None:
        raise RuntimeError('Unsupported {} statement'.format(repr(stmt)))

    return func(stmt, whitelist)


def python2vega_expr(value, whitelist=[]):
    """Convert Python code or Python function to a valid Vega expression."""
    if isinstance(value, str):
        parsed = ast.parse(value, '<string>', 'eval')

        return pythonstmt2vega(parsed.body, whitelist)

    if isinstance(value, (types.FunctionType, types.MethodType)):
        if getattr(value, '__name__', '') in ('', '<lambda>'):
            raise RuntimeError('Anonymous functions not supported')

        value = inspect.getsource(value)

        func = ast.parse(value, '<string>', 'exec').body[0]

        if len(func.body) > 1:
            raise RuntimeError("""
                The only statement in your function must be a `Return` statement or an `if` statement,
                but a value of:\n {} was given""".format(value))

        return pythonstmt2vega(func.body[0], whitelist)

    raise RuntimeError('python2vega_expr only supports code string or functions as input')
