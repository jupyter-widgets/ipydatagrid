#!/usr/bin/env python
# coding: utf-8

# Copyright (c) QuantStack.
# Distributed under the terms of the Modified BSD License.

"""
TODO: Add module docstring
"""

from traitlets import (
    Any, Bool, Dict, Enum, Instance, Int, List, Unicode, default, validate
)
from copy import deepcopy
from ipywidgets import DOMWidget, widget_serialization, CallbackDispatcher

from ._frontend import module_name, module_version
from .cellrenderer import CellRenderer, TextRenderer
from math import floor
import pandas as pd
import numpy as np


class SelectionHelper():

    """A Helper Class for processing selections. Provides an iterator
    to traverse selected cells.
    """

    def __init__(self, grid, **kwargs):
        super(SelectionHelper, self).__init__(**kwargs)
        self._grid = grid
        self._num_columns = -1
        self._num_rows = -1

    def __iter__(self):
        self._rect_index = 0
        self._cell_index = 0
        self._selections = [self._transform_rect_for_selection_mode(rect) for rect in self._grid.selections]
        return self

    def __next__(self):
        if self._rect_index >= len(self._selections):
            raise StopIteration

        rect = self._selections[self._rect_index]
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
        """
        Returns all selected cells as a list. Each cell is represented as a dictionary
        with keys 'r': row and 'c': column
        """
        cells = []
        it = self.__iter__()

        for cell in it:
            cells.append(cell)

        return cells

    def all_values(self):
        """
        Returns values for all selected cells as a list.
        """
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
        for i in range(0, self._rect_index):
            if self._cell_in_rect(cell, self._selections[i]):
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

# modified from ipywidgets original
def _data_to_json(x, obj):
    if isinstance(x, dict):
        return {k: _data_to_json(v, obj) for k, v in x.items()}
    elif isinstance(x, (list, tuple)):
        return [_data_to_json(v, obj) for v in x]
    else:
        if isinstance(x, float):
            if np.isnan(x):
                return '$NaN$'
            elif np.isposinf(x):
                return '$Infinity$'
            elif np.isneginf(x):
                return '$NegInfinity$'
        elif x is pd.NaT:
            return '$NaT$'
        return x

_data_serialization = {
    'from_json': widget_serialization['from_json'],
    'to_json': _data_to_json
}

class DataGrid(DOMWidget):

    """A Grid Widget with filter, sort and selection capabilities.

    Attributes
    ----------
    base_row_size : int (default: 20)
        Default row height
    base_column_size : int (default: 64)
        Default column width
    base_row_header_size : int (default: 64)
        Default row header width
    base_column_header_size : int (default: 20)
        Default column header height
    header_visibility : {'all', 'row', 'column', 'none'} (default: 'all')
        Header visibility mode
        'all': both row and column headers visible
        'row': only row headers visible
        'column': only column headers visible
        'none': neither row and column headers visible
    data : pandas dataframe
        Data to display on Data Grid.
    renderers : dict
        Custom renderers to use for cell rendering. Keys of dictionary specify
        column name, and value specifies the renderer
    default_renderer : CellRenderer (default: TextRenderer)
        Default renderer to use for cell rendering
    selection_mode : {'row', 'column', 'cell', 'none'} (default: 'none')
        Selection mode used when user clicks on grid or makes selections
        programmatically.
        'row': Selecting a cell will select all the cells on the same row
        'column': Selecting a cell will select all the cells on the same column
        'cell': Individual cell selection
        'none': Selection disabled
    selections : list of dict
        List of all selections. Selections are represented as rectangular
        regions. Rectangles are defined as dictionaries with keys:
        'r1': start row, 'c1': start column, 'r2': end row, 'c2': end column.
        Start of rectangle is top-left corner and end is bottom-right corner
    editable : boolean (default: false)
        Boolean indicating whether cell grid can be directly edited
    column_widths : Dict of strings to int (default: {})
        Dict to specify custom column sizes
        The keys (strings) indicate the names of the columns
        The values (integers) indicate the widths

    Accessors (not observable traitlets)
    ---------
    selected_cells : list of dict
        List of selected cells. Each cell is represented as a dictionary
        with keys 'r': row and 'c': column
    selected_cell_values : list
        List of values for all selected cells.
    selected_cell_iterator : iterator
        An iterator to traverse selected cells one by one.
    """

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
    _data = Dict().tag(sync=True, **_data_serialization)

    renderers = Dict(Instance(CellRenderer)).tag(sync=True, **widget_serialization)
    default_renderer = Instance(CellRenderer).tag(sync=True, **widget_serialization)
    selection_mode = Enum(default_value='none', values=['row', 'column', 'cell', 'none']).tag(sync=True)
    selections = List(Dict).tag(sync=True, **widget_serialization)
    editable = Bool(False).tag(sync=True)
    column_widths = Dict({}).tag(sync=True)


    _cell_change_handlers = CallbackDispatcher()
    _cell_click_handlers = CallbackDispatcher()

    def __init__(self, dataframe, **kwargs):
        self.data = dataframe
        super(DataGrid, self).__init__(**kwargs)
        self.on_msg(self.__handle_custom_msg)
        
    def __handle_custom_msg(self, _, content, buffers):
        if content["event_type"] == 'cell-changed':
            row = content["row"]
            column = self._column_index_to_name(content["column_index"])
            value =  content["value"]
            # update data on kernel
            self._data['data'][row][column] = value
            # notify python listeners
            self._cell_change_handlers({
                'row': row,
                'column': column,
                'column_index': content["column_index"],
                'value':value
            })
        elif content["event_type"] == 'cell-click':
            # notify python listeners
            self._cell_click_handlers({
                'region': content['region'],
                'column': content['column'],
                'column_index': content['column_index'],
                'row': content['row'],
                'primary_key_row': content['primary_key_row'],
                'cell_value': content['cell_value']
            })

    @property
    def data(self):
        return pd.DataFrame(self._data['data']).set_index(self._data['schema']['primaryKey'])

    @data.setter
    def data(self, dataframe):
        schema = pd.io.json.build_table_schema(dataframe)
        data = dataframe.reset_index().to_dict(orient='records')

        # Check for multiple primary keys
        key = schema['primaryKey']
        num_index_levels = len(key) if isinstance(key, list) else 1

        # Check for nested columns in schema, if so, we need to update the
        # schema to represent the actual column name values
        if isinstance(schema['fields'][-1]['name'], tuple):
            num_column_levels = len(dataframe.columns.levels)
            primary_key = list(key)

            for i in range(num_index_levels):
                new_name = [''] * num_column_levels
                new_name[0] = schema['fields'][i]['name']
                schema['fields'][i]['name'] = tuple(new_name)
                primary_key[i] = tuple(new_name)
            schema['primaryKey'] = primary_key

        self._data = {'data': data,
                      'schema': schema,
                      'fields': [{field['name']:None} for field in schema['fields']]}

    def get_cell_value(self, column, row_index):
        """Gets the value for a single cell by column name and row index.

        Tuples should be used to index into multi-index columns.

        Note: The provided row_index should correspond to the row index in the
        untransformed dataset."""

        return self._data['data'][row_index][column]

    def set_cell_value(self, column, primary_key, value):
        """Sets the value for a single cell by column name and primary key.

        Note: This method returns a boolean to indicate if the operation
        was successful.
        """

        row_index = self._get_row_index_of_primary_key(primary_key)

        # Bail early if key could not be found
        if row_index is None:
            return False

        if column in self._data['data'][row_index] and row_index is not None:
            self._data['data'][row_index][column] = value
            self._notify_cell_change(row_index, column, value)
            return True

        return False

    def get_cell_value_by_index(self, column_index, row_index):
        """Gets the value for a single cell by column index and row index."""

        column = self._column_index_to_name(column_index)
        if column is not None:
            return self._data['data'][row_index][column]

        return None

    def set_cell_value_by_index(self, column_index, row_index, value):
        """Sets the value for a single cell by column index and row index.

        Note: This method returns a boolean to indicate if the operation
        was successful.
        """

        column = self._column_index_to_name(column_index)
        if column is not None and row_index >= 0 and row_index < len(self._data['data']):
            self._data['data'][row_index][column] = value
            self._notify_cell_change(row_index, column, value)
            return True

        return False

    def _notify_cell_change(self, row, column, value):
        column_index = self._column_name_to_index(column)
        # notify python listeners
        self._cell_change_handlers({'row': row, 'column': column, 'column_index': column_index, 'value': value})
        # notify front-end
        self.comm.send(data={
            'method': 'custom',
            'content': {
                'event_type': 'cell-changed',
                'row': row,
                'column': column,
                'column_index': column_index,
                'value': value
            }
        })

    def get_visible_data(self):
        """Returns a dataframe of the current View."""

        data = deepcopy(self._data)
        if self._visible_rows:
            data['data'] = [data['data'][i] for i in self._visible_rows]

        return pd.DataFrame(data['data']).set_index(self._data['schema']['primaryKey'])

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
        """Clears all selections."""
        self.selections.clear()
        self.send_state('selections')

    def select(self, row1, column1, row2=None, column2=None, clear_mode='none'):
        """
        Select an individual cell or rectangular cell region.
        Parameters
        ----------
        row1 : int
            Row index for individual cell selection or
            start row index for rectangular region selection.
        column1 : int
            Column index for individual cell selection or
            start column index for rectangular region selection.
        row2 : int or None, optional (default: None)
            End row index for rectangular region selection.
        column2 : int or None, optional (default: None)
            End column index for rectangular region selection.
        clear_mode : string, optional, {'all', 'current', 'none'} (default: 'none')
            Clear mode to use when there are pre-existing selections.
            'all' removes all pre-existing selections
            'current' removes last pre-existing selection
            'none' keeps pre-existing selections
        """
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
        """
        List of selected cells. Each cell is represented as a dictionary
        with keys 'r': row and 'c': column
        """
        return SelectionHelper(grid=self).all()

    @property
    def selected_cell_values(self):
        """
        List of values for all selected cells.
        """
        return SelectionHelper(grid=self).all_values()

    @property
    def selected_cell_iterator(self):
        """
        An iterator to traverse selected cells one by one.
        """
        return SelectionHelper(grid=self)

    @validate('selections')
    def _validate_selections(self, proposal):
        selections = proposal['value']
        
        for rectangle in selections:
            r1 = min(rectangle['r1'], rectangle['r2'])
            c1 = min(rectangle['c1'], rectangle['c2'])
            r2 = max(rectangle['r1'], rectangle['r2'])
            c2 = max(rectangle['c1'], rectangle['c2'])
            rectangle['r1'] = r1
            rectangle['c1'] = c1
            rectangle['r2'] = r2
            rectangle['c2'] = c2

        return selections

    @validate('editable')
    def _validate_editable(self, proposal):
        value = proposal['value']
        
        if value and self.selection_mode == 'none':
            self.selection_mode = 'cell'

        return value

    def on_cell_change(self, callback, remove=False):
        """Register a callback to execute when a cell value changed.

        The callback will be called with one argument, the dictionary
        containing cell information with keys
        "row", "column", "column_index", "value".

        Parameters
        ----------
        remove: bool (optional)
            Set to true to remove the callback from the list of callbacks.
        """
        self._cell_change_handlers.register_callback(callback, remove=remove)

    def on_cell_click(self, callback, remove=False):
        """Register a callback to execute when a cell is clicked.

        The callback will be called with one argument, the dictionary
        containing cell information with following keys:
          "region", "column", "column_index", "row", "primary_key_row",
          "cell_value"

        Parameters
        ----------
        remove: bool (optional)
            Set to true to remove the callback from the list of callbacks.
        """
        self._cell_click_handlers.register_callback(callback, remove=remove)

    def _column_index_to_name(self, column_index):
        if 'schema' not in self._data or 'fields' not in self._data['schema']:
            return None

        primary_keys = [] if 'primaryKey' not in self._data['schema'] else self._data['schema']['primaryKey']
        col_headers = [field['name'] for field in self._data['schema']['fields'] if field['name'] not in primary_keys]

        return None if len(col_headers) <= column_index else col_headers[column_index]

    def _column_name_to_index(self, column_name):
        if 'schema' not in self._data or 'fields' not in self._data['schema']:
            return None

        primary_keys = [] if 'primaryKey' not in self._data['schema'] else self._data['schema']['primaryKey']
        col_headers = [field['name'] for field in self._data['schema']['fields'] if field['name'] not in primary_keys]

        try:
            return col_headers.index(column_name)
        except ValueError:
            return None

    def _get_row_index_of_primary_key(self, value):
        value = value if isinstance(value, list) else [value]
        primary_key = self._data['schema']['primaryKey']
        if len(value) != len(primary_key):
            raise ValueError('The provided primary key value must be the same length as the primary key.')
        row_index = None

        for i, row in enumerate(self._data['data']):
            if all([row[primary_key[j]] == value[j] for j in range(len(primary_key))]):
                row_index = i
                break

        return row_index
