import pytest
import pandas as pd
from ipydatagrid import DataGrid


def test_selections():
    df = pd.DataFrame(data={"A":[1,2,3],"B":[4,5,6]})
    datagrid = DataGrid(df, selection_mode="cell", layout={"height":"100px"}, editable=True)
    datagrid.select(1,0,2,1) # Select 1A to 2B

    assert datagrid.selections == [{'r1': 1, 'c1': 0, 'r2': 2, 'c2': 1}]

def test_selection_clearing():
    df = pd.DataFrame(data={"A":[1,2,3],"B":[4,5,6]})
    datagrid = DataGrid(df, selection_mode="cell", layout={"height":"100px"}, editable=True)
    datagrid.select(1,0,2,1) # Select 1A to 2B
    datagrid.clear_selection()
    assert datagrid.selections == []