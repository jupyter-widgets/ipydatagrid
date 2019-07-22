#!/usr/bin/env python
# coding: utf-8

# Copyright (c) QuantStack.
# Distributed under the terms of the Modified BSD License.

"""
TODO: Add module docstring
"""

from ipywidgets import DOMWidget, Widget, widget_serialization
from traitlets import (
    Any, Bool, Dict, Enum, Instance, Int, List, Unicode
)
from ._frontend import module_name, module_version


class GridBase(DOMWidget):
    _model_name = Unicode('GridModel').tag(sync=True)
    _model_module = Unicode(module_name).tag(sync=True)
    _model_module_version = Unicode(module_version).tag(sync=True)
    _view_name = Unicode('GridView').tag(sync=True)
    _view_module = Unicode(module_name).tag(sync=True)
    _view_module_version = Unicode(module_version).tag(sync=True)

    base_row_size = Int(20).tag(sync=True)
    base_column_size = Int(64).tag(sync=True)
    base_row_header_size = Int(64).tag(sync=True)
    base_column_header_size = Int(20).tag(sync=True)

    header_visibility = Enum(default_value='all', values=['all', 'row', 'column', 'none']).tag(sync=True)


class JSONGrid(GridBase):
    _model_name = Unicode('JSONGridModel').tag(sync=True)

    data = Dict().tag(sync=True)

    def view(self, transforms):
        return JSONGridView(jsongrid=self, transforms=transforms)


class Transform(Widget):
    _model_module = Unicode(module_name).tag(sync=True)
    _model_module_version = Unicode(module_version).tag(sync=True)

    field = Unicode().tag(sync=True)


class Filter(Transform):
    _model_name = Unicode('FilterModel').tag(sync=True)

    operator = Enum(values=['<', '>', '=']).tag(sync=True)
    value = Any().tag(sync=True)

    def __init__(self, field, operator, value, *args, **kwargs):
        super(Filter, self).__init__(*args, field=field, operator=operator, value=value, **kwargs)


class Sort(Transform):
    _model_name = Unicode('SortModel').tag(sync=True)

    desc = Bool(True).tag(sync=True)

    def __init__(self, field, desc=True, *args, **kwargs):
        super(Sort, self).__init__(*args, field=field, desc=desc, **kwargs)


class JSONGridView(GridBase):
    _model_name = Unicode('JSONGridViewModel').tag(sync=True)

    jsongrid = Instance(JSONGrid).tag(sync=True, **widget_serialization)
    transforms = List(Instance(Transform)).tag(sync=True, **widget_serialization)
