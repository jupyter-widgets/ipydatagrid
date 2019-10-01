#!/usr/bin/env python
# coding: utf-8

# Copyright (c) QuantStack.
# Distributed under the terms of the Modified BSD License.

"""
TODO: Add module docstring
"""

from traitlets import (
    Any, Bool, Dict, Enum, Instance, Int, List, Unicode, default
)
from copy import deepcopy
from ipywidgets import DOMWidget, Widget, widget_serialization

from ._frontend import module_name, module_version
from .cellrenderer import CellRenderer, TextRenderer
from math import floor


class SelectedCells(Widget):
    _model_name = Unicode('SelectedCells').tag(sync=True)
    _model_module = Unicode(module_name).tag(sync=True)
    _model_module_version = Unicode(module_version).tag(sync=True)

    def __init__(self, grid, **kwargs):
        super(SelectedCells, self).__init__(**kwargs)
        self._grid = grid

    def __iter__(self):
        self._rect_index = 0
        self._cell_index = 0
        return self

    def __next__(self):
        cell_rects = self._grid.selections
        if self._rect_index >= len(cell_rects):
            raise StopIteration

        rect = cell_rects[self._rect_index]
        row_col = self._index_to_row_col(rect, self._cell_index)
        self._cell_index += 1

        if row_col is None:
            self._rect_index += 1
            self._cell_index = 0
            #print("_rect_index {rect}, _cell_index {cell}".format(rect=self._rect_index, cell=self._cell_index))
            return self.__next__()
        else:
            return {
                'r': row_col['row'],
                'c': row_col['column']
            }

    def _index_to_row_col(self, rect, index):
        #print("_index_to_row_col {rect}, index {index}".format(rect=rect, index=index))
        num_rows = rect['r2'] - rect['r1'] + 1
        num_cols = rect['c2'] - rect['c1'] + 1
        if index > (num_rows * num_cols - 1):
            return None

        return {
            'row': rect['r1'] + floor(index / num_cols),
            'column': rect['c1'] + index % num_cols
        }

class DataGrid(DOMWidget):
    _model_name = Unicode('DataGridModel').tag(sync=True)
    _model_module = Unicode(module_name).tag(sync=True)
    _model_module_version = Unicode(module_version).tag(sync=True)
    _view_name = Unicode('DataGridView').tag(sync=True)
    _view_module = Unicode(module_name).tag(sync=True)
    _view_module_version = Unicode(module_version).tag(sync=True)

    base_row_size = Int(20).tag(sync=True)
    base_column_size = Int(64).tag(sync=True)
    base_row_header_size = Int(64).tag(sync=True)
    base_column_header_size = Int(20).tag(sync=True)

    header_visibility = Enum(default_value='all', values=['all', 'row', 'column', 'none']).tag(sync=True)

    _transforms = List(Dict).tag(sync=True, **widget_serialization)
    _visible_rows = List(Int).tag(sync=True)
    data = Dict().tag(sync=True)

    renderers = Dict(Instance(CellRenderer)).tag(sync=True, **widget_serialization)
    default_renderer = Instance(CellRenderer).tag(sync=True, **widget_serialization)
    selection_mode = Enum(default_value='none', values=['row', 'column', 'cell', 'none']).tag(sync=True)
    selections = List(Dict).tag(sync=True, **widget_serialization)

    def get_cell_value(self, column, row_index):
        """Gets the value for a single cell."""

        return self.data['data'][row_index][column]

    def get_visible_data(self):
        """Returns the dataset of the current View."""

        data = deepcopy(self.data)
        if self._visible_rows:
            data['data'] = [data['data'][i] for i in self._visible_rows]
        return data

    def transform(self, transforms):
        """Apply a list of transformation to this DataGrid."""

        # TODO: Validate this input, or let it fail on view side?
        self._transforms = transforms

    def revert(self):
        """Revert all transformations."""

        self._transforms = []

    @default('default_renderer')
    def _default_renderer(self):
        return TextRenderer()

    def select_rectangle(self, rectangle):
        self.selections.append(rectangle)
        self.send_state('selections')

    def deselect_rectangle(self, rectangle):
        pass

    def select_cell(self, cell):
        self.select_rectangle({
            'r1': cell['r'],
            'c1': cell['c'],
            'r2': cell['r'],
            'c2': cell['c']
        })

    def deselect_cell(self, cell):
        self.deselect_rectangle({
            'r1': cell['r'],
            'c1': cell['c'],
            'r2': cell['r'],
            'c2': cell['c']
        })

    @property
    def selected_cells(self):
        return iter(SelectedCells(grid=self))
