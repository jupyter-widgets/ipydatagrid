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
from bqplot import Scale, ColorScale

from ._frontend import module_name, module_version


class Predicate(Widget):
    _model_name = Unicode('PredicateModel').tag(sync=True)
    _model_module = Unicode(module_name).tag(sync=True)
    _model_module_version = Unicode(module_version).tag(sync=True)

    cell_field = Enum(values=['value', 'row', 'column']).tag(sync=True)
    operator = Enum(values=['<', '>', '<=', '>=', '=', 'contains']).tag(sync=True)
    reference_value = Any().tag(sync=True)
    output_if_true = Any().tag(sync=True)
    output_if_false = Any(allow_none=True, default_value=None).tag(sync=True)

    def __init__(self, cell_field, operator, reference_value, output_if_true, output_if_false=None, *args, **kwargs):
        super(Predicate, self).__init__(
            *args,
            cell_field=cell_field, operator=operator, reference_value=reference_value,
            output_if_true=output_if_true, output_if_false=output_if_false, **kwargs
        )


class Predicates(TraitType):
    """A custom trait for a list of Predicates returning a specified valid TraitType value."""
    default_value = []

    def __init__(self, output_trait, **kwargs):
        self.output_trait = output_trait

        super(Predicates, self).__init__(**kwargs)

    def validate(self, obj, value):
        if isinstance(value, Predicate):
            self._validate_predicate(value)
            return value

        if isinstance(value, list):
            for element in value:
                self._validate_predicate(element)
            return value

        self.error(obj, value)

    def _validate_predicate(self, predicate):
        self.output_trait.validate(predicate, predicate.output_if_true)
        if predicate.output_if_false is not None:
            self.output_trait.validate(predicate, predicate.output_if_false)

    def info(self):
        return 'a Predicate/list of Predicates returning {}'.format(self.output_trait.info())


class CellRenderer(Widget):
    _model_name = Unicode('CellRendererModel').tag(sync=True)
    _model_module = Unicode(module_name).tag(sync=True)
    _model_module_version = Unicode(module_version).tag(sync=True)
    _view_name = Unicode('CellRendererView').tag(sync=True)
    _view_module = Unicode(module_name).tag(sync=True)
    _view_module_version = Unicode(module_version).tag(sync=True)

    font = Union((
        Unicode(), Predicates(Unicode()), Instance(Scale)
    ), default_value='12px sans-serif').tag(sync=True, **widget_serialization)
    text_color = Union((
        Color(), Predicates(Color()), Instance(ColorScale)
    ), default_value='black').tag(sync=True, **widget_serialization)
    background_color = Union((
        Color(), Predicates(Color()), Instance(ColorScale)
    ), default_value='white').tag(sync=True, **widget_serialization)
    vertical_alignment = Union((
        Enum(values=['top', 'center', 'bottom']), Predicates(Enum(values=['top', 'center', 'bottom'])), Instance(Scale)
    ), default_value='center').tag(sync=True, **widget_serialization)
    horizontal_alignment = Union((
        Enum(values=['left', 'center', 'right']), Predicates(Enum(values=['left', 'center', 'right'])), Instance(Scale)
    ), default_value='left').tag(sync=True, **widget_serialization)
    # format = Unicode(allow_none=True, default_value=None).tag(sync=True)
