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
            return self.__next__()
        elif self._cell_in_previous_selected_rects(row_col):
            return self.__next__()
        else:
            return row_col

    def __len__(self):
        length = 0
        it = self.__iter__()

        for _ in it:
            length += 1

        return length

    def all(self):
        cells = []
        it = self.__iter__()

        for cell in it:
            cells.append(cell)

        return cells

    def all_values(self):
        values = []
        it = self.__iter__()

        for cell in it:
            value = self._grid.get_cell_value_by_index(cell['c'], cell['r'])
            values.append(value)

        return values

    def _cell_in_rect(self, cell, rect):
        return cell['r'] >= rect['r1'] and cell['r'] <= rect['r2'] and \
               cell['c'] >= rect['c1'] and cell['c'] <= rect['c2']

    def _cell_in_previous_selected_rects(self, cell):
        cell_rects = self._grid.selections
        for i in range(0, self._rect_index):
            if self._cell_in_rect(cell, cell_rects[i]):
                return True
        
        return False

    def _index_to_row_col(self, rect, index):
        num_rows = rect['r2'] - rect['r1'] + 1
        num_cols = rect['c2'] - rect['c1'] + 1
        if index > (num_rows * num_cols - 1):
            return None

        return {
            'r': rect['r1'] + floor(index / num_cols),
            'c': rect['c1'] + index % num_cols
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
        """Gets the value for a single cell by column name and row index."""

        return self.data['data'][row_index][column]

    def get_cell_value_by_index(self, column_index, row_index):
        """Gets the value for a single cell by column index and row index."""

        column = self._column_index_to_name(column_index)
        if column is not None:
            return self.data['data'][row_index][column]
        return None

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

    def clear_selection(self):
        self.selections.clear()
        self.send_state('selections')

    def select_rectangle(self, rectangle):
        self.selections.append(rectangle)
        self.send_state('selections')

    def select_cell(self, cell):
        self.select_rectangle({
            'r1': cell['r'],
            'c1': cell['c'],
            'r2': cell['r'],
            'c2': cell['c']
        })

    @property
    def selected_cells(self):
        return SelectedCells(grid=self).all()

    @property
    def selected_cell_values(self):
        return SelectedCells(grid=self).all_values()

    @property
    def selected_cell_iterator(self):
        return SelectedCells(grid=self)

    def _get_row_header_length(self):
        if 'schema' not in self.data or 'primaryKey' not in self.data['schema']:
            return 0

        return len(self.data['schema']['primaryKey'])

    def _column_index_to_name(self, column_index):
        if 'schema' not in self.data or 'fields' not in self.data['schema']:
            return None

        primary_keys = [] if 'primaryKey' not in self.data['schema'] else self.data['schema']['primaryKey']
        col_headers = [field['name'] for field in self.data['schema']['fields'] if field['name'] not in primary_keys]

        return None if len(col_headers) <= column_index else col_headers[column_index]

    def _column_name_to_index(self, column_name):
        if 'schema' not in self.data or 'fields' not in self.data['schema']:
            return None

        primary_keys = [] if 'primaryKey' not in self.data['schema'] else self.data['schema']['primaryKey']
        col_headers = [field['name'] for field in self.data['schema']['fields'] if field['name'] not in primary_keys]

        try:
            return col_headers.index(column_name)
        except ValueError:
            return None
