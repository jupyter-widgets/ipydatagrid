import pandas as pd
import pytest

from ipydatagrid import DataGrid


@pytest.fixture
def dataframe() -> None:
    return pd.DataFrame(
        data={"A": [1, 2, 3], "B": [4, 5, 6]}, index=["One", "Two", "Three"]
    )


@pytest.fixture
def datagrid(dataframe) -> None:
    return DataGrid(dataframe)


@pytest.fixture
def data_object(dataframe) -> None:
    return DataGrid.generate_data_object(dataframe, "ipydguuid", "key")


@pytest.mark.parametrize("clear", [True, False])
def test_selections(clear: bool, dataframe: pd.DataFrame) -> None:
    grid = DataGrid(dataframe, selection_mode="cell", editable=True)
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


def test_data_getter(dataframe) -> None:
    grid = DataGrid(dataframe)
    assert grid.data.equals(dataframe)


def test_data_setter(dataframe) -> None:
    grid = DataGrid(dataframe)
    new_df = pd.DataFrame(data={"A": [0, 0, 0], "B": [4, 5, 6]})
    grid.data = new_df
    assert grid.data.equals(new_df)


def test_get_cell_value(datagrid: DataGrid) -> None:
    cell = datagrid.get_cell_value("B", "Three")
    assert cell == [6]


def test_set_cell_value() -> None:
    """Cannot be tested without a running front end"""
    pass


def get_cell_value_by_index(datagrid: DataGrid) -> None:
    cell = datagrid.get_cell_value_by_index("B", 1)
    assert cell == [5]


def test_set_cell_value_by_index() -> None:
    """Cannot be tested without a running front end"""
    pass


@pytest.mark.parametrize("invalid_index", [True, False])
def test_column_name_to_index(invalid_index: bool, datagrid: DataGrid) -> None:
    if invalid_index:
        assert datagrid._column_name_to_index("Z") is None
    else:
        assert datagrid._column_name_to_index("A") == 0


@pytest.mark.parametrize("invalid_index", [True, False])
def test_column_index_to_name(invalid_index: bool, data_object: dict) -> None:
    if invalid_index:
        assert DataGrid._column_index_to_name(data_object, 4) is None
    else:
        assert DataGrid._column_index_to_name(data_object, 1) == "B"


def test_get_col_headers(data_object) -> None:
    assert DataGrid._get_col_headers(data_object) == ["A", "B"]


@pytest.mark.parametrize("invalid_prim_key", [True, False])
def test_get_row_index_of_primary_key(
    invalid_prim_key: bool, datagrid: DataGrid
) -> None:
    if invalid_prim_key:
        assert datagrid._get_row_index_of_primary_key("Nay") == []
    else:
        assert datagrid._get_row_index_of_primary_key("Two") == [1]


@pytest.mark.parametrize("invalid_coords", [True, False])
def test_get_cell_value_by_numerical_index(
    invalid_coords: bool, data_object: dict
) -> None:
    if invalid_coords:
        assert (
            DataGrid._get_cell_value_by_numerical_index(data_object, 2, 2)
            is None
        )
    else:
        assert (
            DataGrid._get_cell_value_by_numerical_index(data_object, 1, 0) == 4
        )


def test_data_object_generation(dataframe: pd.DataFrame) -> None:
    data_object = DataGrid.generate_data_object(dataframe, "ipydguuid", "key")
    expected_output = {
        "data": [
            {"key": "One", "A": 1, "B": 4, "ipydguuid": 0},
            {"key": "Two", "A": 2, "B": 5, "ipydguuid": 1},
            {"key": "Three", "A": 3, "B": 6, "ipydguuid": 2},
        ],
        "schema": {
            "fields": [
                {"name": "key", "type": "string"},
                {"name": "A", "type": "integer"},
                {"name": "B", "type": "integer"},
                {"name": "ipydguuid", "type": "integer"},
            ],
            "primaryKey": ["key", "ipydguuid"],
            "pandas_version": "0.20.0",
            "primaryKeyUuid": "ipydguuid",
        },
        "fields": [
            {"key": None},
            {"A": None},
            {"B": None},
            {"ipydguuid": None},
        ],
    }

    assert data_object == expected_output


def test_selected_cell_values(monkeypatch, datagrid, dataframe):
    # Mocking data returned from front-end
    def mock_get_visible_data():
        return dataframe

    monkeypatch.setattr(datagrid, "get_visible_data", mock_get_visible_data)
    datagrid.select(1, 0, 2, 1)  # Select 1A to 2B

    assert datagrid.selected_cell_values == [2, 5, 3, 6]
