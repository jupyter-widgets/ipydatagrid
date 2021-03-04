import pandas as pd
import pytest

from ipydatagrid import DataGrid


@pytest.mark.parametrize("clear", [True, False])
def test_selections(clear: bool) -> None:
    df = pd.DataFrame(data={"A": [1, 2, 3], "B": [4, 5, 6]})
    layout = {"height": "100px"}
    grid = DataGrid(df, selection_mode="cell", layout=layout, editable=True)
    grid.select(1, 0, 2, 1)  # Select 1A to 2B
    if clear:
        grid.clear_selection()
        assert grid.selected_cells == []
    else:
        assert grid.selected_cells == [
            {"c": 0, "r": 1},
            {"c": 1, "r": 1},
            {"c": 0, "r": 2},
            {"c": 1, "r": 2},
        ]
