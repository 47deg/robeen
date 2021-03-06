import { h, Component, Element, Prop } from "@stencil/core";

import { Selection, select, event } from "d3-selection";
import { max } from "d3-array";
import { ScaleBand, scaleBand, ScaleLinear, scaleLinear } from "d3-scale";
import { axisBottom, axisLeft } from "d3-axis";

import { formatter, circularFind } from "@app/utils/utils";
import { DEFAULT_GRAPH_DATA_BAR } from "@app/shared/default-graph-data";

import { GraphData, JMHData } from "@app/types/types";

@Component({
  tag: "robeen-chart",
})
export class Chart {
  @Prop() metrics!: JMHData;
  @Element() chartEl: HTMLElement;
  graphData: GraphData<number[]>;
  d3sSvg: Selection<SVGElement, any, HTMLElement, any>;
  d3sRoot: Selection<SVGElement, any, HTMLElement, any>;
  width: number;
  height: number;
  x: ScaleLinear<number, number>;
  y: ScaleBand<string>;
  tooltipEl: HTMLRobeenTooltipElement;

  componentWillLoad() {
    this.graphData = { ...DEFAULT_GRAPH_DATA_BAR };
    this.graphData.labels = this.metrics.map((metric) => metric.benchmark);
    this.graphData.data = this.metrics.map(
      (metric) => metric.primaryMetric.score
    );
  }

  componentDidLoad() {
    this.d3sSvg = select(this.chartEl.getElementsByTagName("svg")[0]);

    this.height =
      this.d3sSvg.node().getBoundingClientRect().height -
      this.graphData.barChart.margin.top -
      this.graphData.barChart.margin.bottom;

    try {
      this.initSlots();
      this.drawChart();

      const onResize = () => {
        this.drawChart();
      };

      window.addEventListener("resize", onResize);
    } catch (e) {
      console.warn(e);
      this.drawError(e);
    }
  }

  drawError(message: string): void {
    this.setRoot();
    this.d3sRoot.append("text").text(message);
  }

  drawChart(): void {
    if (this.hasData()) {
      this.setRoot();

      this.width =
        this.d3sSvg.node().getBoundingClientRect().width -
        this.graphData.barChart.margin.left -
        this.graphData.barChart.margin.right;

      const originalGraphData: number[] = this.graphData.data;
      const originalGraphDataSortedIndexes: any[] = originalGraphData
        .map((val, ind) => ({ ind, val }))
        .sort((a, b) => (a.val >= b.val ? 1 : 0))
        .map((obj) => obj.ind);

      const maxValue = max<number, number>(originalGraphData, (data) => data);

      this.x = scaleLinear()
        .domain([0, Math.ceil(maxValue / 100) * 100])
        .range([0, this.width]);

      const sortData: boolean = false;

      this.y = scaleBand()
        .domain(
          originalGraphDataSortedIndexes.map(
            (sortedIndex, originaIndex): string =>
              `${
                this.graphData.labels[sortData ? sortedIndex : originaIndex]
                  .split(".")
                  .slice(-1)[0]
              }`
          )
        )
        .range([0, this.height])
        .padding(0.2);

      this.drawAxis();
      this.drawGrid();
      this.drawBars();
    }
  }

  hasData(): Error | boolean {
    return this.graphData.hasData(this.graphData);
  }

  setRoot(): void {
    if (this.d3sRoot) {
      this.d3sRoot.remove();
    }

    this.d3sRoot = this.d3sSvg
      .append("g")
      .attr(
        "transform",
        `translate(${this.graphData.barChart.margin.left}, ${this.graphData.barChart.margin.top})`
      );
  }

  async initSlots() {
    const element: Element = this.chartEl.getElementsByClassName("tooltip")[0];

    if (element) {
      const component = this.chartEl.querySelector("robeen-tooltip");
      await component.setTooltip(element);
      this.tooltipEl = component;
    }
  }

  drawAxis(): void {
    if (this.graphData.barChart.axis.x.visible) {
      this.d3sRoot
        .append("g")
        .attr("class", "x axis")
        .attr("transform", `translate(0, ${this.height})`)
        .call(
          axisBottom(this.x).tickFormat((domainValue) =>
            formatter(this.graphData.barChart.axis.x.format, domainValue)
          )
        );
    }

    if (this.graphData.barChart.axis.y.visible) {
      this.d3sRoot.append("g").attr("class", "y axis").call(axisLeft(this.y));
    }
  }

  drawGrid(): void {
    if (this.graphData.barChart.axis.x.gridVisible) {
      this.d3sRoot
        .append("g")
        .style("opacity", 0.1)
        .attr("class", "grid")
        .call(
          axisBottom(this.x)
            .tickSize(this.height)
            .tickFormat(() => "")
        );
    }

    if (this.graphData.barChart.axis.y.gridVisible) {
      this.d3sRoot
        .append("g")
        .style("opacity", 0.1)
        .attr("class", "grid")
        .call(
          axisLeft(this.y)
            .tickSize(-this.width)
            .tickFormat(() => "")
        );
    }
  }

  drawBars(): void {
    this.d3sRoot
      .append("g")
      .attr("class", "bar-group")
      .selectAll(".bar")
      .data(this.graphData.data)
      .enter()
      .filter((data) => this.x(data) > 0)
      .append("rect")
      .attr("class", "bar")
      .attr("x", 0)
      .attr("height", this.y.bandwidth())
      .attr("y", (_, index) =>
        this.y(`${this.graphData.labels[index].split(".").slice(-1)[0]}`)
      )
      .attr("width", (data) => this.x(data))
      .attr("fill", (_, index) => circularFind(this.graphData.colors, index))
      .on("mousemove", (_, index) =>
        this.eventsTooltip({ index, isToShow: true })
      )
      .on("mouseout", () => this.eventsTooltip({ isToShow: false }));
  }

  eventsTooltip({
    index,
    isToShow,
  }: {
    index?: number;
    isToShow: boolean;
  }): void {
    const toShow = () => {
      this.tooltipEl.show(index, this.metrics[index], [
        event.pageX,
        event.pageY,
      ]);
    };

    const toHide = () => this.tooltipEl.hide();

    if (this.tooltipEl) {
      isToShow ? toShow() : toHide();
    }
  }

  render() {
    return (
      <div class="o-layout">
        <div class="o-layout--chart">
          <svg style={this.graphData ? this.graphData.styles : {}} />
        </div>
        <div class="o-layout--slot">
          <robeen-tooltip />
        </div>
      </div>
    );
  }
}
