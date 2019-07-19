
# ipydatagrid

[![Build Status](https://travis-ci.org/QuantStack/ipydatagrid.svg?branch=master)](https://travis-ci.org/QuantStack/ipydatagrid)
[![codecov](https://codecov.io/gh/QuantStack/ipydatagrid/branch/master/graph/badge.svg)](https://codecov.io/gh/QuantStack/ipydatagrid)


Fast Datagrid widget for the Jupyter Notebook and JupyterLab

## Installation

You can install using `pip`:

```bash
pip install ipydatagrid
```

Or if you use jupyterlab:

```bash
pip install ipydatagrid
jupyter labextension install @jupyter-widgets/jupyterlab-manager
```

If you are using Jupyter Notebook 5.2 or earlier, you may also need to enable
the nbextension:
```bash
jupyter nbextension enable --py [--sys-prefix|--user|--system] ipydatagrid
```
