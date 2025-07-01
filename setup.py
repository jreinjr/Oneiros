from setuptools import setup, find_packages

with open("requirements.txt") as f:
    requirements = f.read().splitlines()
    # Filter out empty lines and comments
    requirements = [req for req in requirements if req and not req.startswith('#')]

setup(
    name="oneiros",
    version="0.1.0",
    packages=find_packages(),
    install_requires=requirements,
)