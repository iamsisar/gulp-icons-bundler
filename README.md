web-icon-bundler
================


* * *

### fileNameFilter(basename)

Strips out a three digits incremental prefix from a string.

**Parameters**

**basename**: `string`, Strips out a three digits incremental prefix from a string.

**Returns**: `string`


### colorizeSvg(src, color)

Makes a coloured copy of .svg files replacing all the 'fill'
values across the document nodes.

**Parameters**

**src**: `string`, Path of the original .svg

**color**: `string`, HEX value of the new colour

**Returns**: `object`, Vinyl object representing the new file


### rasterizeSvg(src, scale, name)

Converts .svg to .png, checking if the source is newer.

**Parameters**

**src**: `string`, Path of the .svg

**scale**: `object`, Resize values

**name**: `string`, The suffix that will be added to the output filename

**Returns**: `object`, Vinyl object representing the new file


### consolidateTemplate(src, dest, basename, glyphs)

Creates a new file from a template, passing necessary variables.

**Parameters**

**src**: `string`, Path of the template

**dest**: `string`, Path of the destination directory

**basename**: `string`, Output filename

**glyphs**: `array`, A list of objects representing all the glyphs
                          created by gulp-iconfont.

**Returns**: `object`, Vinyl object representing the file



* * *










