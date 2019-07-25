#!/usr/bin/env python
# coding: utf-8

# Copyright (c) QuantStack.
# Distributed under the terms of the Modified BSD License.

"""
TODO: Add module docstring
"""

from traitlets import (
    Any, Enum, Instance, Unicode, Union, TraitType
)

from ipywidgets import Widget, widget_serialization, Color

# Dependency to bqplot is temporary, we should remove this dependency once scales are extracted from bqplot
from bqplot import ColorScale

from ._frontend import module_name, module_version


class OperatorBase(Widget):
    _model_module = Unicode(module_name).tag(sync=True)
    _model_module_version = Unicode(module_version).tag(sync=True)

    cell_field = Enum(values=['value', 'row', 'column']).tag(sync=True)
    operator = Enum(values=['<', '>', '<=', '>=', '=', 'contains']).tag(sync=True)
    reference_value = Any().tag(sync=True)
    output_if_true = Any().tag(sync=True)


class Operator(OperatorBase):
    _model_name = Unicode('OperatorModel').tag(sync=True)

    def __init__(self, cell_field, operator, reference_value, output_if_true, *args, **kwargs):
        super(Operator, self).__init__(
            *args,
            cell_field=cell_field, operator=operator, reference_value=reference_value,
            output_if_true=output_if_true, **kwargs
        )


class TernaryOperator(OperatorBase):
    _model_name = Unicode('TernaryOperatorModel').tag(sync=True)

    output_if_false = Any().tag(sync=True)

    def __init__(self, cell_field, operator, reference_value, output_if_true, output_if_false, *args, **kwargs):
        super(TernaryOperator, self).__init__(
            *args,
            cell_field=cell_field, operator=operator, reference_value=reference_value,
            output_if_true=output_if_true, output_if_false=output_if_false, **kwargs
        )


class Operation(TraitType):
    """A custom trait for a list of Operators returning a specified valid TraitType value."""
    default_value = []

    def __init__(self, output_trait, **kwargs):
        self.output_trait = output_trait

        super(Operation, self).__init__(**kwargs)

    def validate(self, obj, value):
        if isinstance(value, OperatorBase):
            self._validate_operator(value)
            return value

        if isinstance(value, list):
            for element in value:
                self._validate_operator(element)
            return value

        self.error(obj, value)

    def _validate_operator(self, operator):
        self.output_trait.validate(operator, operator.output_if_true)

        if isinstance(operator, TernaryOperator):
            self.output_trait.validate(operator, operator.output_if_false)

    def info(self):
        return 'an Operator/list of Operators returning {}'.format(self.output_trait.info())


class CellRenderer(Widget):
    _model_name = Unicode('CellRendererModel').tag(sync=True)
    _model_module = Unicode(module_name).tag(sync=True)
    _model_module_version = Unicode(module_version).tag(sync=True)
    _view_name = Unicode('CellRendererView').tag(sync=True)
    _view_module = Unicode(module_name).tag(sync=True)
    _view_module_version = Unicode(module_version).tag(sync=True)

    font = Union((
        Unicode(), Operation(Unicode())
    ), default_value='12px sans-serif').tag(sync=True, **widget_serialization)
    text_color = Union((
        Color(), Instance(ColorScale), Operation(Color())
    ), default_value='black').tag(sync=True, **widget_serialization)
    background_color = Union((
        Color(), Instance(ColorScale), Operation(Color())
    ), default_value='white').tag(sync=True, **widget_serialization)
    # vertical_alignment = Enum(values=['top', 'center', 'bottom']).tag(sync=True)
    # horizontal_alignment = Enum(values=['left', 'center', 'right']).tag(sync=True)
    # format = Unicode(allow_none=True, default_value=None).tag(sync=True)
