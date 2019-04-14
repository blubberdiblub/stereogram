#!/usr/bin/env python3

from typing import Tuple, Union

import bisect
import time

from math import floor

# import numpy as np

from PIL import Image


Color = Union[Tuple[int, int, int], Tuple[int, int, int, int]]


class Tile:

    class _TileProxyRight:

        def __init__(self, tile: 'Tile', y: float) -> None:

            self._tile = tile
            self._y = y

        def __getitem__(self, item: Union[float, Tuple[float]]) -> Color:

            if isinstance(item, tuple):
                return self._tile[(self._y, *item)]

            return self._tile[self._y, item]

    def __getitem__(self,
                    item: Union[Tuple[float, float], float, Tuple[float]],
                    ) -> Union[Color, _TileProxyRight]:

        try:
            y, x = item

        except TypeError:
            y, x = item, ...

        except ValueError:
            try:
                y, = item

            except ValueError:
                raise TypeError(f"expected 1 or 2 values, but got {len(item)}")

            x = ...

        float(y)

        if x is ...:
            return self._TileProxyRight(self, y)

        float(x)

        return 0, 0, 0, 0


class Checkered(Tile):

    def __init__(self, color1=(0, 0, 85), color2=(170, 170, 170)) -> None:
        super().__init__()

        self.color1 = color1
        self.color2 = color2

    def __getitem__(self, item: Tuple[float, float]) -> Color:

        try:
            y, x = item
            y %= 1
            x %= 1

        except (TypeError, ValueError):
            return super().__getitem__(item)

        pattern = int(y * 2) + int(x * 2)

        return self.color2 if pattern & 1 else self.color1


class ImageTile(Tile):

    def __init__(self, image: Image, aspect=True, interpolate=True) -> None:
        super().__init__()

        self._pixel = image.load()
        self._width = image.width
        self._height = image.height
        self.scale_x = image.width
        self.scale_y = image.width if aspect else image.height
        self.interpolate = bool(interpolate)

    def __getitem__(self, item: Tuple[float, float]) -> Color:

        try:
            y, x = item
            y = float(y)
            x = float(x)

        except (TypeError, ValueError):
            return super().__getitem__(item)

        x *= self.scale_x
        y *= self.scale_y

        pixel = self._pixel
        if not self.interpolate:
            return pixel[(floor(x) % self._width, floor(y) % self._height)]

        x -= 0.5
        y -= 0.5

        x0, y0 = floor(x), floor(y)

        xq, yq = x - x0, y - y0
        xp, yp = 1 - xq, 1 - yq

        x0 %= self._width
        y0 %= self._height

        x1, y1 = (x0 + 1) % self._width, (y0 + 1) % self._height

        rgb00 = pixel[x0, y0]
        rgb10 = pixel[x1, y0]
        rgb01 = pixel[x0, y1]
        rgb11 = pixel[x1, y1]

        # noinspection PyTypeChecker
        return tuple(round(c00 * xp * yp +
                           c10 * xq * yp +
                           c01 * xp * yq +
                           c11 * xq * yq)
                     for c00, c10, c01, c11
                     in zip(rgb00, rgb10, rgb01, rgb11))


def render(fb: Image, tile: Tile,
           tile_size: Tuple[float, float] = (240, 240),
           num_subpixels: int = 10) -> None:

    tile_width, tile_height = tile_size
    step_x = 1 / tile_width
    step_y = 1 / tile_height

    i_intercept1 = fb.height // 2
    i_intercept2 = fb.height * 5 // 8
    i_intercept3 = fb.height * 6 // 8
    i_intercept4 = fb.height * 7 // 8

    j_intercept1 = fb.width * 5 // 16
    j_intercept2 = fb.width * 11 // 16

    y = 0.0

    for i in range(i_intercept2):

        y += step_y * 0.5

        x = 0.0
        for j in range(fb.width):

            if i < i_intercept1:
                factor = 1.0
            else:
                factor = 10/11 if j_intercept1 <= j < j_intercept2 else 1.0

            x += step_x * factor * 0.5
            fb.putpixel((j, i), tile[y, x])
            x += step_x * factor * 0.5

        y += step_y * 0.5

    hires_n = fb.width * num_subpixels + 1
    inverted_d = [0.0] * hires_n

    slope = 1 / 8
    p1 = 1/4
    p4 = 3/4
    p2 = p1 + slope
    p3 = p4 - slope

    for jj in range(hires_n):
        p = jj / (fb.width * num_subpixels)
        if p <= p1:
            value = 1.0
        elif p < p2:
            value = 1.0 + 0.1 * (p - p1) / (p2 - p1)
        elif p <= p3:
            value = 1.1
        elif p < p4:
            value = 1.1 - 0.1 * (p - p3) / (p4 - p3)
        else:
            value = 1.0

        inverted_d[jj] = value

    print(inverted_d[::60 * num_subpixels])

    combined = [0.0] * (hires_n + 120 * num_subpixels)

    for x, jj in enumerate(range(-120 * num_subpixels, 0)):
        combined[jj] = float(x)

    x = combined[-1]
    for jj in range(hires_n):
        last = x
        x = jj + 120 * num_subpixels * inverted_d[jj]
        assert x > last
        combined[jj] = x

    assert combined[-120 * num_subpixels] == 0.0

    print(", ".join(f"{v:.1f}" for v in combined[::60 * num_subpixels]))

    for i in range(i_intercept2, i_intercept3):

        y += step_y * 0.5

        for j in range(fb.width):
            jj = (j + 0.5) * num_subpixels

            left = bisect.bisect_left(combined, jj)
            right = bisect.bisect_right(combined, jj) - 1

            if left <= right:
                x = (left + right) / 2

            else:
                low = combined[right]
                p = (jj - low) / (combined[left] - low)
                x = right + p

            x = x * 2 - jj
            x /= num_subpixels
            if x < 0:
                fb.putpixel((j, i), tile[y, x * step_x])
                continue

            assert x + 1.5 <= j
            x = max(x - 0.5, 0.0)
            idx = floor(x)
            color = fb.getpixel((idx, i))

            if idx < x:
                color2 = fb.getpixel((idx + 1, i))

                p = x - idx
                q = 1.0 - p
                color = tuple(round(c1 * q + c2 * p)
                              for c1, c2 in zip(color, color2))

            fb.putpixel((j, i), color)

        y += step_y * 0.5

    slope = 1 / 4
    p1 = 1/4
    p4 = 3/4
    p2 = p1 + slope
    p3 = p4 - slope

    for jj in range(hires_n):
        p = jj / (fb.width * num_subpixels)
        if p <= p1:
            value = 1.0
        elif p < p2:
            value = 1.0 + 0.2 * (p - p1) / (p2 - p1)
        elif p <= p3:
            value = 1.2
        elif p < p4:
            value = 1.2 - 0.2 * (p - p3) / (p4 - p3)
        else:
            value = 1.0

        inverted_d[jj] = value

    for x, jj in enumerate(range(-120 * num_subpixels, 0)):
        combined[jj] = float(x)

    x = combined[-1]
    for jj in range(hires_n):
        last = x
        x = jj + 120 * num_subpixels * inverted_d[jj]
        assert x > last
        combined[jj] = x

    assert combined[-120 * num_subpixels] == 0.0

    for i in range(i_intercept3, i_intercept4):

        y += step_y * 0.5

        for j in range(fb.width):
            jj = (j + 0.5) * num_subpixels

            left = bisect.bisect_left(combined, jj)
            right = bisect.bisect_right(combined, jj) - 1

            if left <= right:
                x = (left + right) / 2

            else:
                low = combined[right]
                p = (jj - low) / (combined[left] - low)
                x = right + p

            x = x * 2 - jj
            x /= num_subpixels
            if x < 0:
                fb.putpixel((j, i), tile[y, x * step_x])
                continue

            assert x + 1.5 <= j
            x = max(x - 0.5, 0.0)
            idx = floor(x)
            color = fb.getpixel((idx, i))

            if idx < x:
                color2 = fb.getpixel((idx + 1, i))

                p = x - idx
                q = 1.0 - p
                color = tuple(round(c1 * q + c2 * p)
                              for c1, c2 in zip(color, color2))

            fb.putpixel((j, i), color)

        y += step_y * 0.5

    for i in range(i_intercept4, fb.height):

        y += step_y * 0.5

        x = 0.0
        for j in range(fb.width):

            factor = 5/6 if j_intercept1 <= j < j_intercept2 else 1.0

            x += step_x * factor * 0.5
            fb.putpixel((j, i), tile[y, x])
            x += step_x * factor * 0.5

        y += step_y * 0.5


def main() -> None:
    img = Image.new('RGB', (1920, 1080))

    # tile = Checkered()
    tile = ImageTile(Image.open('resources/1852617.jpg'))

    # print(tile[3.9, -1.1])

    t0 = time.perf_counter()
    render(img, tile)
    t1 = time.perf_counter()

    print(f"rendering took {t1-t0:.3} s")

    img.show(command='/usr/bin/eog')


if __name__ == '__main__':
    main()
