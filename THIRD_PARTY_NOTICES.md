# Third-Party Notices

This project depends on slick2d-ts for the browser runtime. slick2d-ts is distributed under the BSD 3-Clause License and includes attribution for selected Slick2D API behavior.

Desktop Java runtime dependencies are documented separately in desktop/RUNTIME_DEPENDENCIES.md where present. The desktop distribution includes third-party runtime jars and native libraries for Slick2D, LWJGL 2, JInput, and JOrbis/Jogg. The generated desktop ZIP also carries dependency license files under `licenses/`:

- `licenses/SLICK2D.txt`
- `licenses/LWJGL-2.txt`
- `licenses/JINPUT.txt`
- `licenses/LGPL-2.0.txt`
- `licenses/JORBIS-NOTICE.txt`

The generated desktop ZIP also carries the corresponding JOrbis 0.0.17 source archive at `sources/jorbis-0.0.17-sources.jar`.

## slick2d-ts

BSD 3-Clause License

Copyright (c) 2026, meatfighter
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

3. Neither the name of the copyright holder nor the names of its contributors
   may be used to endorse or promote products derived from this software
   without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

## Slick2D

Slick2D is distributed under the BSD 3-Clause License. Its upstream notice is reproduced below.

BSD 3-Clause License

Copyright (c) 2013, Slick2D
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

3. Neither the name of the Slick2D nor the names of its contributors may be
   used to endorse or promote products derived from this software without
   specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

## LWJGL 2

The desktop build includes `lwjgl.jar`, `lwjgl_util.jar`, and native LWJGL/OpenAL runtime libraries from the LWJGL 2 runtime set. LWJGL 2 is distributed under a BSD-style license by the Lightweight Java Game Library Project. The desktop ZIP includes the license text at `licenses/LWJGL-2.txt`.

## JInput

The desktop build includes `jinput.jar` and JInput native libraries. JInput is distributed under a BSD license by the JInput project. The desktop ZIP includes the license text at `licenses/JINPUT.txt`.

## JOrbis/Jogg

The desktop build includes `jorbis.jar`, which contains JCraft JOrbis and Jogg classes for Ogg Vorbis decoding. JOrbis is distributed under the GNU Lesser General Public License by JCraft, Inc. The desktop ZIP includes the complete GNU Library GPL v2 text at `licenses/LGPL-2.0.txt`, the JOrbis/Jogg notice at `licenses/JORBIS-NOTICE.txt`, and corresponding JOrbis 0.0.17 source at `sources/jorbis-0.0.17-sources.jar`.
