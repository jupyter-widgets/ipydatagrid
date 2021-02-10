from pathlib import Path

from jupyter_packaging import (
    combine_commands,
    create_cmdclass,
    ensure_targets,
    install_npm,
)
from setuptools import setup

JS_DIR = Path(__file__).absolute().parent

# Representative files that should exist after a successful build
jstargets = [JS_DIR / "dist" / "index.js"]

package_data_spec = {"name": ["nbextension/*.*js*", "labextension/*"]}

data_files_spec = [
    ("share/jupyter/nbextensions/ipydatagrid", "ipydatagrid/nbextension", "**"),
    (
        "share/jupyter/labextensions/ipydatagrid",
        "ipydatagrid/labextension",
        "**",
    ),
    ("etc/jupyter/nbconfig/notebook.d", ".", "ipydatagrid.json"),
]

cmdclass = create_cmdclass(
    "jsdeps",
    package_data_spec=package_data_spec,
    data_files_spec=data_files_spec,
)
cmdclass["jsdeps"] = combine_commands(
    install_npm(JS_DIR, build_cmd="build", npm=["npm", "--legacy-peer-deps"]),
    ensure_targets(jstargets),
)

# See setup.cfg for other parameters
setup(cmdclass=cmdclass)
