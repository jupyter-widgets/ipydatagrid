# Copyright (c) Bloomberg.
# Distributed under the terms of the Modified BSD License.

from ._version import __version__  # noqa
from .datagrid import DataGrid, SelectionHelper  # noqa
from .cellrenderer import CellRenderer, TextRenderer, BarRenderer, VegaExpr, Expr  # noqa


def _jupyter_nbextension_paths():
    return [
        {
            "section": "notebook",
            "src": "nbextension",
            "dest": "ipydatagrid",
            "require": "ipydatagrid/extension",
        }
    ]


def _jupyter_labextension_paths():
    return [{"src": "labextension", "dest": "ipydatagrid"}]
