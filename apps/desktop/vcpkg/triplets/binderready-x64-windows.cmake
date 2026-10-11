# Release-only dynamic libraries: the installer ships them as separate, replaceable DLLs
# (libheif and libde265 are LGPL).
set(VCPKG_TARGET_ARCHITECTURE x64)
set(VCPKG_CRT_LINKAGE dynamic)
set(VCPKG_LIBRARY_LINKAGE dynamic)
set(VCPKG_BUILD_TYPE release)
