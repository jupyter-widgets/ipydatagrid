# Copyright (c) Bloomberg.
# Distributed under the terms of the Modified BSD License.

from ._version import __version__  # noqa
from .cellrenderer import (  # noqa
    BarRenderer,
    CellRenderer,
    Expr,
    HyperlinkRenderer,
    TextRenderer,
    VegaExpr,
)
from .datagrid import DataGrid, SelectionHelper  # noqa


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
