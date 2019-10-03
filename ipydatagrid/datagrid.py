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
from ipywidgets import DOMWidget, widget_serialization

from ._frontend import module_name, module_version
from .cellrenderer import CellRenderer, TextRenderer
from math import floor


class SelectionHelper():
    def __init__(self, grid, **kwargs):
        super(SelectionHelper, self).__init__(**kwargs)
        self._grid = grid
        self._num_columns = -1
        self._num_rows = -1

    def __iter__(self):
        self._rect_index = 0
        self._cell_index = 0
        return self

    def __next__(self):
        cell_rects = self._grid.selections
        if self._rect_index >= len(cell_rects):
            raise StopIteration

        rect = self._transform_rect_for_selection_mode(cell_rects[self._rect_index])
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

    def _transform_rect_for_selection_mode(self, rect):
        selection_mode = self._grid.selection_mode
        if selection_mode == 'row':
            return {
                'r1': rect['r1'], 'c1': 0,
                'r2': rect['r2'], 'c2': self._get_num_columns() - 1
            }
        elif selection_mode == 'column':
            return {
                'r1': 0, 'c1': rect['c1'],
                'r2': self._get_num_rows() - 1, 'c2': rect['c2']
            }
        else:
            return rect

    def _get_num_columns(self):
        if self._num_columns != -1:
            return self._num_columns

        data = self._grid.data
        primary_keys = [] if 'primaryKey' not in data['schema'] else data['schema']['primaryKey']
        col_headers = [field['name'] for field in data['schema']['fields'] if field['name'] not in primary_keys]
        self._num_columns = len(col_headers)
        return self._num_columns

    def _get_num_rows(self):
        if self._num_rows != -1:
            return self._num_rows
        
        data = self._grid.data
        self._num_rows = 0 if 'data' not in data else len(data['data'])
        return self._num_rows


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

    def __init__(self, **kwargs):
        super(DataGrid, self).__init__(**kwargs)
        
        self.observe(self._selections_changed, 'selections')

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

    def select(self, row1, column1, row2=None, column2=None, clear_mode='none'):
        if row2 is None or column2 is None:
            row2 = row1
            column2 = column1

        if clear_mode == 'all':
            self.selections.clear()
        elif clear_mode == 'current':
            if len(self.selections) > 0:
                self.selections.pop()

        self.selections.append({
            'r1': min(row1, row2), 'c1': min(column1, column2),
            'r2': max(row1, row2), 'c2': max(column1, column2)
        })
        self.send_state('selections')

    @property
    def selected_cells(self):
        return SelectionHelper(grid=self).all()

    @property
    def selected_cell_values(self):
        return SelectionHelper(grid=self).all_values()

    @property
    def selected_cell_iterator(self):
        return SelectionHelper(grid=self)

    def _selections_changed(self, change):
        self.selections = change['new']
        for rectangle in self.selections:
            r1 = min(rectangle['r1'], rectangle['r2'])
            c1 = min(rectangle['c1'], rectangle['c2'])
            r2 = max(rectangle['r1'], rectangle['r2'])
            c2 = max(rectangle['c1'], rectangle['c2'])
            rectangle['r1'] = r1
            rectangle['c1'] = c1
            rectangle['r2'] = r2
            rectangle['c2'] = c2

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
